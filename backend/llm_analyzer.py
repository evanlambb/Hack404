import anthropic
import json
import logging
import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logger = logging.getLogger(__name__)


class BiasSpan(BaseModel):
    text: str
    category: str
    explanation: str
    suggested_revision: str
    start_index: int
    end_index: int


class BiasAnalysisResponse(BaseModel):
    original_text: str
    bias_spans: List[BiasSpan]
    summary: Dict[str, Any]


class LLMBiasAnalyzer:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY"))
        # Using the latest Claude 3.5 Sonnet model
        self.model = "claude-sonnet-4-20250514"

        # Define bias categories for validation
        self.bias_categories = [
            "Race / Ethnicity",
            "Gender / Gender Identity",
            "Age",
            "Religion / Belief System",
            "Sexual Orientation",
            "Socioeconomic Status",
            "Nationality / Immigration Status",
            "Disability",
            "Education Level",
            "Political Ideology",
            "Physical Appearance"
        ]

    def get_analysis_prompt(self, text: str) -> str:
        """Generate the structured prompt for bias analysis"""
        return f"""You are a highly perceptive bias-detection assistant. Your task is to scan the input text for any instances of bias—whether overt or nuanced—and to categorize each instance according to the definitions below.

**Bias Categories & Definitions**

1. **Race / Ethnicity**  
   Bias based on skin color, ancestry, or cultural background.  
   _E.g._ "exotic name," "All [race] people are…."

2. **Gender / Gender Identity**  
   Bias around roles or expectations for men, women, non-binary.  
   _E.g._ Calling a woman "bossy" vs. a man "assertive."

3. **Age**  
   Bias toward or against people based on age.  
   _E.g._ "Technophobic seniors," "kids are carefree."

4. **Religion / Belief System**  
   Bias for or against faith or lack thereof.  
   _E.g._ Labeling someone "fundamentalist" to imply extremism.

5. **Sexual Orientation**  
   Bias toward LGBTQ+ identities.  
   _E.g._ Treating heterosexuality as "default."

6. **Socioeconomic Status**  
   Bias based on wealth, education, or occupation.  
   _E.g._ "White-collar snob," "poor people are lazy."

7. **Nationality / Immigration Status**  
   Bias tied to country of origin or immigrant status.  
   _E.g._ Calling non-citizens "illegals."

8. **Disability**  
   Bias toward physical, cognitive, or mental-health differences.  
   _E.g._ Using "crazy" to dismiss concerns.

9. **Education Level**  
   Bias based on formal schooling or credentials.  
   _E.g._ Equating jargon use with intelligence.

10. **Political Ideology**  
    Bias around stated or assumed political leanings.  
    _E.g._ Calling liberals "snowflakes."

11. **Physical Appearance**  
    Bias around weight, height, attractiveness.  
    _E.g._ "Big-boned" to soften a weight comment.

**Input Text to Analyze:**
{text}

**CRITICAL INSTRUCTIONS:**

1. **NO OVERLAPPING SPANS**: Each piece of text should only be flagged ONCE for bias. Do not create multiple entries that cover the same words or characters.

2. **CHOOSE PRIMARY BIAS ONLY**: If a text span could potentially fall into multiple bias categories, identify and select ONLY the most relevant, primary, or significant bias type. For example:
   - If "his accent" could be both racial and nationality bias, choose the most contextually relevant one
   - If "she's too emotional" could be both gender and age bias, select the primary bias being expressed

3. **PRIORITIZE MOST HARMFUL/SIGNIFICANT**: When multiple bias types could apply, prioritize:
   - More specific over general biases
   - Direct discrimination over subtle implications  
   - Protected characteristics over social preferences

4. **AVOID REDUNDANCY**: Do not flag the same concept multiple times with different categories.

**Instructions:**
Please analyze the text and return your findings in the following JSON format. If no bias is detected, return an empty array for "bias_instances".

{{
  "bias_instances": [
    {{
      "text_span": "exact words or phrase from the input",
      "category": "one of the 11 categories listed above",
      "explanation": "why this span is biased and what assumption or stereotype it reflects",
      "suggested_revision": "a neutral or inclusive way to rephrase it"
    }}
  ]
}}

Return ONLY the JSON response, no additional text or formatting."""

    async def analyze_text(self, text: str) -> BiasAnalysisResponse:
        """Analyze text for bias using Claude"""
        try:
            if not text.strip():
                return BiasAnalysisResponse(
                    original_text=text,
                    bias_spans=[],
                    summary={
                        "total_bias_instances": 0,
                        "categories_detected": [],
                        "overall_assessment": "No bias detected",
                        "risk_level": "Low"
                    }
                )

            # Make API call to Claude
            response = await self._make_claude_request(text)

            # Parse the response
            bias_spans = self._parse_response(response, text)

            # Generate summary
            summary = self._generate_summary(bias_spans, text)

            return BiasAnalysisResponse(
                original_text=text,
                bias_spans=bias_spans,
                summary=summary
            )

        except Exception as e:
            logger.error(f"Error analyzing text with Claude: {e}")
            raise Exception(f"Bias analysis failed: {str(e)}")

    async def _make_claude_request(self, text: str) -> str:
        """Make request to Claude API"""
        try:
            prompt = self.get_analysis_prompt(text)

            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.3,
                system="You are a bias detection expert. Always return valid JSON as specified in the user's request.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            return response.content[0].text

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise Exception(f"Claude API call failed: {str(e)}")

    def _parse_response(self, response: str, original_text: str) -> List[BiasSpan]:
        """Parse Claude response into BiasSpan objects"""
        try:
            # Clean the response to ensure valid JSON
            response = response.strip()
            if response.startswith('```json'):
                response = response[7:]
            if response.endswith('```'):
                response = response[:-3]

            data = json.loads(response)
            bias_spans = []

            for instance in data.get('bias_instances', []):
                text_span = instance.get('text_span', '')
                category = instance.get('category', '')
                explanation = instance.get('explanation', '')
                suggested_revision = instance.get('suggested_revision', '')

                # Improved text matching with multiple strategies
                start_index, end_index = self._find_text_span(original_text, text_span)
                
                # Skip if we couldn't find the text at all
                if start_index == -1:
                    logger.warning(f"Skipping span that couldn't be located: {text_span}")
                    continue

                # Validate category
                if category not in self.bias_categories:
                    logger.warning(f"Invalid category detected: {category}")
                    category = "Other"

                # Extract the actual text at the found position
                actual_text = original_text[start_index:end_index]
                
                # Debug: Check if LLM's text_span matches what we found
                text_to_use = actual_text
                if actual_text.strip().lower() != text_span.strip().lower():
                    logger.warning(f"TEXT MISMATCH DETECTED:")
                    logger.warning(f"  LLM identified: '{text_span}'")
                    logger.warning(f"  Found in text:   '{actual_text}'")
                    logger.warning(f"  Position: {start_index}-{end_index}")
                    logger.warning(f"  Context: '{original_text[max(0, start_index-20):end_index+20]}'")
                    
                    # Use LLM's original text to ensure tooltip/highlighting consistency
                    # This prevents mismatches where highlighting shows different text than tooltip
                    text_to_use = text_span
                    logger.info(f"Using LLM's original text for consistency: '{text_to_use}'")

                bias_spans.append(BiasSpan(
                    text=text_to_use,  # Use LLM's text for tooltip/highlighting consistency
                    category=category,
                    explanation=explanation,
                    suggested_revision=suggested_revision,
                    start_index=start_index,
                    end_index=end_index
                ))

            return bias_spans

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.error(f"Response content: {response}")
            return []
        except Exception as e:
            logger.error(f"Error parsing response: {e}")
            return []

    def _find_text_span(self, original_text: str, text_span: str) -> tuple[int, int]:
        """Find the best match for a text span in the original text"""
        if not text_span or not original_text:
            return -1, -1
            
        # Strategy 1: Exact case-sensitive match
        start_index = original_text.find(text_span)
        if start_index != -1:
            return start_index, start_index + len(text_span)
        
        # Strategy 2: Case-insensitive match
        start_index = original_text.lower().find(text_span.lower())
        if start_index != -1:
            return start_index, start_index + len(text_span)
        
        # Strategy 3: Look for individual words from the span
        span_words = re.findall(r'\w+', text_span.lower())
        if not span_words:
            return -1, -1
            
        # Find the first word of the span
        first_word = span_words[0]
        text_words = re.findall(r'\w+', original_text.lower())
        
        try:
            first_word_index = text_words.index(first_word)
            # Calculate character position
            word_starts = []
            word_pattern = re.compile(r'\w+')
            for match in word_pattern.finditer(original_text.lower()):
                word_starts.append(match.start())
            
            if first_word_index < len(word_starts):
                start_char = word_starts[first_word_index]
                
                # Try to find the end by looking for the last word
                if len(span_words) > 1:
                    last_word = span_words[-1]
                    # Look for last word after first word position
                    remaining_text = original_text.lower()[start_char:]
                    last_word_pos = remaining_text.find(last_word)
                    if last_word_pos != -1:
                        end_char = start_char + last_word_pos + len(last_word)
                        return start_char, end_char
                
                # Fallback: use length of span
                return start_char, min(start_char + len(text_span), len(original_text))
                
        except (ValueError, IndexError):
            pass
        
        # Strategy 4: Fuzzy matching - find longest common substring
        def longest_common_substring(s1: str, s2: str) -> tuple[int, int, int]:
            """Find longest common substring, return (start_in_s1, start_in_s2, length)"""
            s1_lower = s1.lower()
            s2_lower = s2.lower()
            longest_length = 0
            best_s1_start = 0
            best_s2_start = 0
            
            for i in range(len(s1_lower)):
                for j in range(len(s2_lower)):
                    length = 0
                    while (i + length < len(s1_lower) and 
                           j + length < len(s2_lower) and 
                           s1_lower[i + length] == s2_lower[j + length]):
                        length += 1
                    
                    if length > longest_length:
                        longest_length = length
                        best_s1_start = i
                        best_s2_start = j
            
            return best_s1_start, best_s2_start, longest_length
        
        s1_start, s2_start, length = longest_common_substring(original_text, text_span)
        if length >= min(4, len(text_span) // 2):  # At least 4 chars or half the span
            return s1_start, s1_start + length
        
        # If all strategies fail, don't create the span
        return -1, -1

    def _generate_summary(self, bias_spans: List[BiasSpan], text: str) -> Dict[str, Any]:
        """Generate summary statistics"""
        total_bias_instances = len(bias_spans)
        categories_detected = list(set(span.category for span in bias_spans))

        # Calculate risk level
        if total_bias_instances == 0:
            risk_level = "Low"
            overall_assessment = "No bias detected"
        elif total_bias_instances <= 2:
            risk_level = "Medium"
            overall_assessment = f"Minor bias detected ({total_bias_instances} instance{'s' if total_bias_instances > 1 else ''})"
        else:
            risk_level = "High"
            overall_assessment = f"Multiple bias instances detected ({total_bias_instances} instances)"

        return {
            "total_bias_instances": total_bias_instances,
            "categories_detected": categories_detected,
            "overall_assessment": overall_assessment,
            "risk_level": risk_level,
            "text_length": len(text),
            "bias_density": total_bias_instances / max(len(text.split()), 1)
        }
