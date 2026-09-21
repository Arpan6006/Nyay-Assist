import os
import json
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.llms import Ollama
from langchain_core.prompts import PromptTemplate
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import sys

# Setup DB connection
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from modules.db_sync.db import engine
from modules.db_sync.schema import BlogPost

FAISS_INDEX_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "faiss_index")

CATEGORIES = {
    "Theft": "What are the provisions and penalties regarding theft (including snatching) under the BNS?",
    "Assault": "What constitutes criminal force and assault under the BNS, and what are the penalties?",
    "Cybercrime": "How does the BNS handle cybercrimes or electronic record forgery?",
    "Women's Safety": "Summarize the key provisions in the BNS regarding crimes against women, such as harassment or assault.",
    "Murder & Culpable Homicide": "What is the difference between murder and culpable homicide not amounting to murder under the BNS?",
    "Kidnapping & Abduction": "What are the laws and penalties related to kidnapping, abduction, and trafficking under the BNS?",
    "Defamation": "What constitutes defamation under the BNS, and what are the legal remedies and penalties?",
    "Treason & Sedition": "How does the BNS handle offenses against the state, such as treason or acts endangering national security?",
    "Fraud & Cheating": "What are the provisions for cheating, fraud, and criminal breach of trust under the BNS?",
    "Public Nuisance": "What constitutes a public nuisance, and how are offenses affecting public health and safety handled?"
}

def generate_blog_posts():
    print("Starting blog post generation...")
    if not os.path.exists(FAISS_INDEX_PATH):
        print(f"Error: FAISS index not found at {FAISS_INDEX_PATH}. Run indexer first.")
        return

    from ...utils import get_optimal_device
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2",
        model_kwargs={"device": get_optimal_device()},
        encode_kwargs={"batch_size": 8}
    )
    vectorstore = FAISS.load_local(FAISS_INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    
    llm = Ollama(model="qwen2.5:7b")
    
    prompt = PromptTemplate(
        template="""You are a legal content writer for the Indian public. Write a plain-language, easy-to-understand article about the following topic based strictly on the provided statutory text context. Do not use outside knowledge.
The article should be professional, calm, and institutional. Include a clear title.

Context:
{context}

Topic to cover:
{question}

Format your response as a JSON object with 'title' and 'body'.
""",
        input_variables=["context", "question"]
    )
    
    chain = prompt | llm

    with Session(engine) as db:
        for category, query in CATEGORIES.items():
            if db.query(BlogPost).filter(BlogPost.crime_type == category).first():
                print(f"Blog post for {category} already exists. Skipping.")
                continue
            print(f"Generating post for category: {category}")
            docs = vectorstore.similarity_search(query, k=8)
            context_text = "\n\n".join([f"Source: {doc.metadata.get('source', 'Unknown')}\n{doc.page_content}" for doc in docs])
            
            # Extract unique source sections (simple heuristic based on filename/chunk)
            source_sections_set = set()
            for doc in docs:
                source = doc.metadata.get('source', '')
                if source:
                    # e.g., bns.txt -> BNS
                    act_name = os.path.basename(source).replace(".txt", "").upper()
                    # We might not have the exact section number in the metadata easily, so we just cite the Act for now, 
                    # or try to extract it from the page_content if we stored it properly.
                    # Since our chunking by section might not have put the section number in metadata, we cite the Act.
                    source_sections_set.add(act_name)
                    
            source_sections = ", ".join(source_sections_set)

            try:
                response = chain.invoke({"context": context_text, "question": query})
                
                # The response might be markdown JSON or plain JSON. Let's try to parse it.
                # Find JSON block
                json_start = response.find("{")
                json_end = response.rfind("}")
                if json_start != -1 and json_end != -1:
                    json_str = response[json_start:json_end+1]
                    try:
                        data = json.loads(json_str, strict=False)
                        title = data.get("title", f"Understanding {category} Laws")
                        body = data.get("body", response)
                    except Exception:
                        title = f"Understanding {category} Laws"
                        body = response
                else:
                    title = f"Understanding {category} Laws"
                    body = response
                
                if isinstance(body, dict) or isinstance(body, list):
                    body = json.dumps(body, indent=2)
                elif not isinstance(body, str):
                    body = str(body)
                
                new_post = BlogPost(
                    title=title,
                    body=body,
                    crime_type=category,
                    source_sections=source_sections
                )
                db.add(new_post)
                db.commit()
                print(f"Successfully generated and saved post: {title}")
                
            except Exception as e:
                print(f"Error generating post for {category}: {e}")

if __name__ == "__main__":
    generate_blog_posts()
