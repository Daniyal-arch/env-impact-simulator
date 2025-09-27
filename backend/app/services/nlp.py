"""
Natural Language Processing service for forest loss queries using Google Gemini API.
"""

import json
import re
import google.generativeai as genai
from typing import Dict, Any
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


# Check available models function
def list_available_models():
    """List all available Gemini models for debugging."""
    try:
        models = genai.list_models()
        available_models = []
        for model in models:
            if hasattr(model, 'name') and 'generateContent' in getattr(model, 'supported_generation_methods', []):
                available_models.append(model.name)
        return available_models
    except Exception as e:
        return f"Error listing models: {e}"


def parse_nl_query(query: str) -> Dict[str, Any]:
    """
    Parse a natural language forest-loss query using Gemini with model fallback.
    """
    
    # Handle different input types
    if isinstance(query, dict):
        # If query is a dict, extract the actual query string
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
    
    # Enhanced prompt for better JSON extraction
    prompt = f"""
    Parse this forest loss query into structured data: "{query}"
    
    Extract these components:
    - Country name (any format - name, code, etc.)
    - Forest loss percentage (as a number)
    - Time period in years from now
    
    Return ONLY a valid JSON object with exactly these keys:
    {{
        "country": "country name or code from the query",
        "forest_loss_percent": number (just the percentage value),
        "years": number (years into the future)
    }}
    
    Examples:
    - "What if Pakistan loses 5% forest in 3 years" → {{"country": "Pakistan", "forest_loss_percent": 5, "years": 3}}
    - "Brazil 10% deforestation by 2030" → {{"country": "Brazil", "forest_loss_percent": 10, "years": 6}}
    
    Return only the JSON object, no other text.
    """
    
    # Try multiple model names in order of preference - UPDATED with your available models
    model_names_to_try = [
        "models/gemini-2.0-flash",           # Fast and efficient
        "models/gemini-2.5-flash",           # Latest flash model  
        "models/gemini-2.0-flash-001",       # Specific version
        "models/gemini-flash-latest",        # Latest alias
        "models/gemini-2.5-pro",             # More powerful if needed
        "models/gemini-pro-latest",          # Pro alias
    ]
    
    last_error = None
    
    for model_name in model_names_to_try:
        try:
            print(f"Trying model: {model_name}")
            model = genai.GenerativeModel(model_name=model_name)
            
            # Generate response
            response = model.generate_content(prompt)
            
            # If we get here, the model worked
            print(f"Successfully used model: {model_name}")
            
            # Extract response text with better error handling
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
                print(f"Error extracting text from response: {extract_error}")
                continue
            
            if not output_text:
                print(f"No output text from model {model_name}")
                continue  # Try next model
            
            # Clean the response - sometimes Gemini adds extra text
            cleaned_text = clean_json_response(output_text)
            
            # Parse the JSON
            try:
                parsed = json.loads(cleaned_text)
                
                # Validate that parsed is a dict
                if not isinstance(parsed, dict):
                    print(f"Parsed result is not a dict: {type(parsed)}")
                    continue
                
                # Validate required keys
                required_keys = ["country", "forest_loss_percent", "years"]
                missing_keys = [key for key in required_keys if key not in parsed]
                
                if missing_keys:
                    return {
                        "status": "error", 
                        "error": f"Missing required keys: {', '.join(missing_keys)}"
                    }
                
                # Validate and convert country to ISO3
                try:
                    country_value = parsed["country"]
                    if not isinstance(country_value, str):
                        country_value = str(country_value)
                    
                    iso3_country = normalize_country_input(country_value)
                    parsed["country"] = iso3_country
                except ValueError as e:
                    return {
                        "status": "error",
                        "error": f"Country resolution failed: {str(e)}"
                    }
                except Exception as e:
                    return {
                        "status": "error",
                        "error": f"Error processing country '{parsed.get('country', 'unknown')}': {str(e)}"
                    }
                
                # Validate numeric values
                try:
                    parsed["forest_loss_percent"] = float(parsed["forest_loss_percent"])
                    parsed["years"] = int(parsed["years"])
                except (ValueError, TypeError) as e:
                    return {
                        "status": "error",
                        "error": f"Numeric validation failed: forest_loss_percent must be numeric and years must be integer. Error: {str(e)}"
                    }
                
                # Validate ranges
                if not (0 < parsed["forest_loss_percent"] <= 100):
                    return {
                        "status": "error",
                        "error": "forest_loss_percent must be between 0 and 100"
                    }
                
                if not (1 <= parsed["years"] <= 50):
                    return {
                        "status": "error",
                        "error": "years must be between 1 and 50"
                    }
                
                # Calculate target year
                from datetime import datetime
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
                
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                print(f"Cleaned text was: {cleaned_text[:500]}")
                continue  # Try next model
            except Exception as e:
                print(f"Unexpected error processing response: {e}")
                continue
        
        except Exception as e:
            last_error = str(e)
            print(f"Model {model_name} failed: {e}")
            continue
    
    # If all models failed, return comprehensive error
    return {
        "status": "error",
        "error": f"All Gemini models failed. Last error: {last_error}",
        "tried_models": model_names_to_try,
        "debug_info": "All available models were attempted but failed"
    }


def clean_json_response(text: str) -> str:
    """
    Clean Gemini response to extract valid JSON.
    Sometimes Gemini adds extra text before/after the JSON.
    """
    
    # Remove markdown code blocks if present
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    
    # Try to find JSON object in the response
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, text, re.DOTALL)
    
    if matches:
        return matches[0].strip()
    
    # If no JSON pattern found, return cleaned text
    return text.strip()


def suggest_query_format(query: str) -> Dict[str, Any]:
    """
    Provide suggestions for improving a natural language query.
    """
    
    suggestions = []
    
    # Check for common components
    has_country = any(word.lower() in query.lower() for word in [
        'pakistan', 'brazil', 'indonesia', 'india', 'usa', 'china', 'russia'
    ])
    
    has_percentage = any(char in query for char in ['%', 'percent'])
    has_number = any(char.isdigit() for char in query)
    has_time = any(word.lower() in query.lower() for word in [
        'year', 'years', 'by', '2030', '2025', '2027', 'future'
    ])
    
    if not has_country:
        suggestions.append("Specify a country name (e.g., 'Pakistan', 'Brazil', 'USA')")
    
    if not has_percentage and not has_number:
        suggestions.append("Include a forest loss percentage (e.g., '5%', '10 percent')")
    
    if not has_time:
        suggestions.append("Specify a time frame (e.g., 'in 5 years', 'by 2030')")
    
    example_queries = [
        "What if Pakistan loses 5% of its forest in 3 years?",
        "Simulate Brazil losing 15% forest cover by 2030",
        "How much CO2 if Indonesia loses 8% forest in 5 years?"
    ]
    
    return {
        "original_query": query,
        "suggestions": suggestions,
        "example_queries": example_queries,
        "has_components": {
            "country": has_country,
            "percentage": has_percentage,
            "timeframe": has_time
        }
    }


# Alternative model names to try if primary fails
ALTERNATIVE_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-pro", 
    "gemini-pro",
    "models/gemini-1.5-flash",
    "models/gemini-1.5-pro"
]


def parse_nl_query_with_fallback(query: str) -> Dict[str, Any]:
    """
    Parse NL query with fallback to alternative model names.
    """
    
    last_error = None
    
    for model_name in ALTERNATIVE_MODELS:
        try:
            # Modify the original function to use different model
            model = genai.GenerativeModel(model_name=model_name)
            
            prompt = f"""
            Parse this forest loss query: "{query}"
            
            Return JSON with: country, forest_loss_percent (number), years (number)
            
            Example: {{"country": "Pakistan", "forest_loss_percent": 5, "years": 3}}
            """
            
            response = model.generate_content(prompt)
            
            # If we get here, the model worked
            print(f"Successfully used model: {model_name}")
            
            # Process the response (reuse logic from main function)
            if hasattr(response, 'text') and response.text:
                output_text = response.text
            elif hasattr(response, 'candidates') and response.candidates:
                if hasattr(response.candidates[0], 'content'):
                    output_text = response.candidates[0].content.parts[0].text
                else:
                    output_text = response.candidates[0].text
            else:
                continue
            
            cleaned_text = clean_json_response(output_text)
            parsed = json.loads(cleaned_text)
            
            # Basic validation
            if all(key in parsed for key in ["country", "forest_loss_percent", "years"]):
                return {
                    "status": "success", 
                    "model_used": model_name,
                    "structured_scenario": parsed
                }
                
        except Exception as e:
            last_error = str(e)
            continue
    
    return {
        "status": "error",
        "error": f"All models failed. Last error: {last_error}",
        "tried_models": ALTERNATIVE_MODELS
    }


# Debug function to test API and models
def debug_gemini_api() -> Dict[str, Any]:
    """
    Debug function to test Gemini API configuration and available models.
    """
    debug_info = {
        "api_key_configured": bool(settings.GEMINI_API_KEY),
        "api_key_length": len(settings.GEMINI_API_KEY) if settings.GEMINI_API_KEY else 0,
        "available_models": None,
        "test_results": {}
    }
    
    # Test listing models
    try:
        available_models = list_available_models()
        debug_info["available_models"] = available_models
    except Exception as e:
        debug_info["available_models_error"] = str(e)
    
    # Test each model with a simple query
    test_models = [
        "models/gemini-2.0-flash",
        "models/gemini-2.5-flash", 
        "models/gemini-flash-latest",
        "models/gemini-2.5-pro",
        "models/gemini-pro-latest"
    ]
    
    for model_name in test_models:
        try:
            model = genai.GenerativeModel(model_name=model_name)
            response = model.generate_content("Say hello in JSON format: {\"message\": \"hello\"}")
            
            debug_info["test_results"][model_name] = {
                "status": "success",
                "response_available": bool(response),
                "has_text": hasattr(response, 'text') and bool(response.text),
                "has_candidates": hasattr(response, 'candidates') and bool(response.candidates)
            }
            
        except Exception as e:
            debug_info["test_results"][model_name] = {
                "status": "error",
                "error": str(e)
            }
    
    return debug_info
if __name__ == "__main__":
    test_queries = [
        "What if Pakistan loses 5% of forest in 3 years?",
        "Brazil 10% deforestation by 2030",
        "Indonesia forest loss 8% in 5 years"
    ]
    
    for query in test_queries:
        print(f"\nTesting: {query}")
        result = parse_nl_query(query)
        print(f"Result: {result}")