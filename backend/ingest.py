import os
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Ensure paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FAISS_INDEX_PATH = os.path.join(DATA_DIR, "faiss_index")

if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# Let's create a dummy law file if none exists to test the RAG
SAMPLE_LAW_FILE = os.path.join(DATA_DIR, "bns_sample.txt")
if not os.path.exists(SAMPLE_LAW_FILE):
    with open(SAMPLE_LAW_FILE, "w", encoding="utf-8") as f:
        f.write("""
Bharatiya Nyaya Sanhita (BNS) Excerpts:
Section 103: Murder. Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.
Section 111: Organized Crime. Any continuing unlawful activity by an individual, singly or jointly, either as a member of an organized crime syndicate or on behalf of such syndicate.
Section 302: Snatching. Theft is snatching if, in order to commit theft, the offender suddenly or quickly or forcibly seizes or secures or grabs or takes away from any person or from his possession any moveable property.
        """)

print("Loading documents...")
# Load all text files in the data directory
docs = []
for file in os.listdir(DATA_DIR):
    if file.endswith(".txt"):
        loader = TextLoader(os.path.join(DATA_DIR, file), encoding="utf-8")
        docs.extend(loader.load())

print(f"Loaded {len(docs)} documents.")

# Split documents into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    length_function=len,
    is_separator_regex=False,
)
chunks = text_splitter.split_documents(docs)
print(f"Split into {len(chunks)} chunks.")

# Create embeddings and FAISS index
print("Generating embeddings... This may take a minute.")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-mpnet-base-v2"
)

vectorstore = FAISS.from_documents(chunks, embeddings)
vectorstore.save_local(FAISS_INDEX_PATH)

print(f"Successfully saved FAISS index to {FAISS_INDEX_PATH}")
