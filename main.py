import os
import sys

if 'OPENAI_API_KEY' not in os.environ:
  sys.stderr.write("""
  You haven't set up your API key yet.
  
  If you don't have an API key yet, visit:
  
  https://platform.openai.com/signup

  1. Make an account or sign in
  2. Click "View API Keys" from the top right menu.
  3. Click "Create new secret key"

  Then, open the Secrets Tool and add OPENAI_API_KEY as a secret.
  """)
  exit(1)

import openai
import streamlit as st
from llama_index import ServiceContext, SimpleDirectoryReader, SummaryIndex
from llama_index.llms import OpenAI

st.set_page_config(
    page_title="Summarization of Paul Graham's essay, powered by LlamaIndex",
    page_icon="🦙",
    layout="centered",
    initial_sidebar_state="auto",
    menu_items=None)

st.title("Summarization of Paul Graham's essay, powered by LlamaIndex 💬🦙")


@st.cache_resource(show_spinner=False)
def load_data():
  """
    Load and index Paul Graham's essay using SummaryIndex.
    
    Returns:
    - ListIndex: Index constructed from the essay data.
  """
  with st.spinner(
      text="Loading and indexing Paul Graham's essay. This may take a while..."
  ):
    reader = SimpleDirectoryReader(input_dir="./data", recursive=True)
    docs = reader.load_data()
    service_context = ServiceContext.from_defaults(
        llm=OpenAI(
            model="gpt-3.5-turbo",
            temperature=0.1,
        ),
        system_prompt=
        "You are an AI assistant that answers questions about Paul Graham's essay."
    )
    index = SummaryIndex.from_documents(docs, service_context=service_context)
    return index


# Create index
index = load_data()

# Create Query Engine
query_engine = index.as_query_engine(response_mode='tree_summarize')

# Take input from the user
user_input = st.text_input("Enter Your Query", "")

# Display the input
if st.button("Submit"):
  st.write(f"Your Query: {user_input}")

  with st.spinner("Thinking..."):
    # Query the index
    result = query_engine.query(user_input)

    # Display the results
    st.write(f"Answer: {str(result)}")
