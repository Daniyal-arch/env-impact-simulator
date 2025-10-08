"""
Natural Language Processing service for forest loss queries using Google Gemini API.
Enhanced to support both historical and projection queries.
"""

import json
import re
import google.generativeai as genai
from typing import Dict, Any
from datetime import datetime
from app.core.config import settings
from app.utils.country_lookup import COUNTRY_NAME_TO_ISO3

# Configure Gemini with AI Studio API key
genai.configure(api_key=settings.GEMINI_API_KEY)


def normalize_country_input(country_input: str) -> str:
    """Convert any country name/code to ISO3 format using existing lookup."""
    
    if not country_input:
        raise ValueError("Country name/code is required")
    
    # Clean and normalize input
    cleaned = country_input.strip().lower()
    
    # If it's already a valid ISO3 code, return as-is
    if len(cleaned) == 3 and cleaned.upper() in set(COUNTRY_NAME_TO_ISO3.values()):
        return cleaned.upper()
    
    # Direct lookup in your existing mapping
    iso3_code = COUNTRY_NAME_TO_ISO3.get(cleaned)
    
    if iso3_code:
        return iso3_code
    
    # Try common variations and partial matches
    for name, code in COUNTRY_NAME_TO_ISO3.items():
        if cleaned in name or name in cleaned:
            return code
    
    # Try some common alternative names not in your lookup
    alternative_names = {
        "america": "USA",
        "us": "USA", 
        "uk": "GBR",
        "britain": "GBR",
        "england": "GBR",
        "brasil": "BRA",
        "burma": "MMR",
        "drc": "COD",
        "democratic republic of congo": "COD"
    }
    
    alt_code = alternative_names.get(cleaned)
    if alt_code:
        return alt_code
    
    # If still not found, provide helpful error with suggestions
    similar_countries = [name for name in COUNTRY_NAME_TO_ISO3.keys() 
                        if cleaned[:3] in name or name[:3] in cleaned]
    suggestions = ", ".join(similar_countries[:5]) if similar_countries else "Brazil, Pakistan, Indonesia, India, USA"
    
    raise ValueError(f"Country '{country_input}' not recognized. Try: {suggestions}")


def parse_nl_query(query: str) -> Dict[str, Any]:
    """
    Parse natural language query for BOTH historical and projection queries.
    """
    
    # Handle different input types
    if isinstance(query, dict):
        if 'query' in query:
            query = query['query']
        elif 'text' in query:
            query = query['text']
        else:
            return {"status": "error", "error": "Invalid input: dict must contain 'query' or 'text' key"}
    
    # Ensure query is a string
    if not isinstance(query, str):
        return {"status": "error", "error": f"Query must be a string, got {type(query)}"}
    
    if not query or not query.strip():
        return {"status": "error", "error": "Query cannot be empty"}
    
    # Clean the query string
    query = str(query).strip()
    
    # Enhanced prompt that handles BOTH query types
    prompt = f"""
Parse this forest query: "{query}"

Determine if this is a HISTORICAL query (asking about past data) or a PROJECTION query (predicting future).

For HISTORICAL queries (e.g., "Show Brazil forest loss", "What is Pakistan's deforestation data", "Display statistics"):
Return: {{"country": "country name", "query_type": "historical"}}

For PROJECTION queries (e.g., "What if Brazil loses 10% by 2030", "Predict 5% loss in 3 years"):
Return: {{"country": "country name", "forest_loss_percent": number, "years": number, "query_type": "projection"}}

Examples:
- "Show me Brazil's forest loss statistics" → {{"country": "Brazil", "query_type": "historical"}}
- "What is Pakistan's historical data?" → {{"country": "Pakistan", "query_type": "historical"}}
- "Display Indonesia deforestation data" → {{"country": "Indonesia", "query_type": "historical"}}
- "Brazil 10% deforestation by 2030" → {{"country": "Brazil", "forest_loss_percent": 10, "years": 6, "query_type": "projection"}}

Return ONLY valid JSON, no other text.
"""
    
    # Try multiple model names in order of preference
    model_names_to_try = [
        "models/gemini-2.0-flash",
        "models/gemini-2.5-flash",
        "models/gemini-2.0-flash-001",
        "models/gemini-flash-latest",
        "models/gemini-2.5-pro",
        "models/gemini-pro-latest"
    ]
    
    last_error = None
    
    for model_name in model_names_to_try:
        try:
            print(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name=model_name)
            
            # Generate response
            response = model.generate_content(prompt)
            
            print(f"Successfully used model: {model_name}")
            
            # Extract response text
            output_text = None
            
            try:
                if hasattr(response, 'text') and response.text:
                    output_text = str(response.text)
                elif hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'content') and candidate.content:
                        if hasattr(candidate.content, 'parts') and candidate.content.parts:
                            output_text = str(candidate.content.parts[0].text)
                    elif hasattr(candidate, 'text'):
                        output_text = str(candidate.text)
            except Exception as extract_error:
                print(f"Error extracting text: {extract_error}")
                continue
            
            if not output_text:
                print(f"No output text from model {model_name}")
                continue
            
            # Clean the response
            cleaned_text = clean_json_response(output_text)
            
            # Parse the JSON
            try:
                parsed = json.loads(cleaned_text)
                
                if not isinstance(parsed, dict):
                    print(f"Parsed result is not a dict: {type(parsed)}")
                    continue
                
                # Validate country (always required)
                country_value = parsed.get("country")
                if not country_value:
                    return {"status": "error", "error": "Country is required"}
                
                # Normalize country to ISO3
                try:
                    iso3_country = normalize_country_input(str(country_value))
                    parsed["country"] = iso3_country
                except ValueError as e:
                    return {"status": "error", "error": f"Country resolution failed: {str(e)}"}
                
                # Determine query type
                query_type = parsed.get("query_type", "historical")
                
                # Build response based on query type
                if query_type == "projection":
                    # PROJECTION QUERY - validate projection parameters
                    if "forest_loss_percent" not in parsed or "years" not in parsed:
                        return {
                            "status": "error",
                            "error": "Projection queries require forest_loss_percent and years"
                        }
                    
                    try:
                        parsed["forest_loss_percent"] = float(parsed["forest_loss_percent"])
                        parsed["years"] = int(parsed["years"])
                    except (ValueError, TypeError):
                        return {
                            "status": "error",
                            "error": "forest_loss_percent must be numeric and years must be integer"
                        }
                    
                    # Validate ranges
                    if not (0 < parsed["forest_loss_percent"] <= 100):
                        return {"status": "error", "error": "forest_loss_percent must be between 0 and 100"}
                    
                    if not (1 <= parsed["years"] <= 50):
                        return {"status": "error", "error": "years must be between 1 and 50"}
                    
                    # Calculate target year
                    current_year = datetime.now().year
                    target_year = current_year + parsed["years"]
                    
                    return {
                        "status": "success",
                        "nl_query": query,
                        "model_used": model_name,
                        "structured_scenario": {
                            "country": parsed["country"],
                            "forest_loss_percent": parsed["forest_loss_percent"],
                            "target_year": target_year,
                            "years_from_now": parsed["years"]
                        }
                    }
                else:
                    # HISTORICAL QUERY - no projection parameters needed
                    return {
                        "status": "success",
                        "nl_query": query,
                        "model_used": model_name,
                        "structured_scenario": {
                            "country": parsed["country"]
                        }
                    }
                
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                print(f"Cleaned text: {cleaned_text[:500]}")
                continue
            except Exception as e:
                print(f"Unexpected error: {e}")
                continue
        
        except Exception as e:
            last_error = str(e)
            print(f"Model {model_name} failed: {e}")
            continue
    
    # If all models failed
    return {
        "status": "error",
        "error": f"All Gemini models failed. Last error: {last_error}",
        "tried_models": model_names_to_try
    }


def clean_json_response(text: str) -> str:
    """Clean Gemini response to extract valid JSON."""
    
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    
    # Find JSON object
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, text, re.DOTALL)
    
    if matches:
        return matches[0].strip()
    
    return text.strip()


if __name__ == "__main__":
    test_queries = [
        "Show me Brazil's historical forest loss",
        "What is Pakistan's deforestation data?",
        "Brazil 10% deforestation by 2030"
    ]
    
    for query in test_queries:
        print(f"\nTesting: {query}")
        result = parse_nl_query(query)
        print(f"Result: {result}")