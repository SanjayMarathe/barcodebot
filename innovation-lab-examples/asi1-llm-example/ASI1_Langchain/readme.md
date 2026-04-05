# ASI1 Integration with LangChain and Tavily Search

This project demonstrates how to integrate a ASI1 API with LangChain and utilize the Tavily Search tool to process search queries. 
The code defines a custom LLM class that sends prompts to your API and then integrates with LangChain’s agent framework to combine LLM responses with search results.

## Features

- **Custom LLM Integration:**  
  Implements a custom LangChain `LLM` that calls the ASI1 API using a defined payload.
  
- **Tavily Search Tool:**  
  Leverages the Tavily Search API to fetch search results as part of an agent chain.

- **Agent Chain Execution:**  
  Sets up an agent chain that processes a search query, calls the ASI1 LLM, and returns a combined result.

- **Environment-Based Configuration:**  
  Manages API keys and sensitive data through environment variables loaded from a `.env` file.

## Prerequisites

- **Python:** Version 3.8 or higher.
- **Dependencies:**
  - [LangChain](https://github.com/langchain-ai/langchain)
  - [Requests](https://pypi.org/project/requests/)
  - [Pydantic](https://pypi.org/project/pydantic/)
  - [python-dotenv](https://pypi.org/project/python-dotenv/)
  - LangChain community tools for Tavily search[langchain.tools]

- Environment Variables
  - ASI_LLM_KEY=<asi1-api_key>
  - TAVILY_API_KEY=<tavily_api_key>

## To Run:
- Run command: `python asi1_langchain.py`



