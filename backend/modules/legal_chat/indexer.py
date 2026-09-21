import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

CORPUS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
TEXT_FILES = ["bns.txt", "bnss.txt", "bsa.txt"]
FAISS_INDEX_PATH = os.path.join(CORPUS_DIR, "data", "faiss_index")

def build_index():
    print("Starting index generation...")
    docs = []
    
    for filename in TEXT_FILES:
        filepath = os.path.join(CORPUS_DIR, "corpus", filename)
        if not os.path.exists(filepath):
            print(f"Warning: {filepath} not found. Ensure build_corpus.py has been run.")
            continue
        
        loader = TextLoader(filepath, encoding="utf-8")
        docs.extend(loader.load())
        
    if not docs:
        print("No documents loaded. Aborting index generation.")
        return

    # Using RecursiveCharacterTextSplitter with rules to respect section boundaries
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        separators=["\n\n", "\n", ".", " ", ""]
    )
    splits = text_splitter.split_documents(docs)
    
    print(f"Created {len(splits)} chunks. Generating embeddings...")
    
    # 768-dim embeddings as specified
    from ...utils import get_optimal_device
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-mpnet-base-v2",
        model_kwargs={"device": get_optimal_device()},
        encode_kwargs={"batch_size": 8}
    )
    
    vectorstore = FAISS.from_documents(documents=splits, embedding=embeddings)
    
    print(f"Saving FAISS index to {FAISS_INDEX_PATH}...")
    vectorstore.save_local(FAISS_INDEX_PATH)
    print("Indexing complete.")

if __name__ == "__main__":
    build_index()
