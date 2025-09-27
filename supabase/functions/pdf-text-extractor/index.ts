import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate if extracted text is readable (not garbage)
function isTextReadable(text: string): boolean {
  if (!text || text.length < 10) return false;
  
  // Check ratio of readable characters to total characters
  const readableChars = text.match(/[a-zA-Z0-9\s.,!?;:()\-]/g) || [];
  const readableRatio = readableChars.length / text.length;
  
  // Check if text has reasonable word patterns
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const meaningfulWords = words.filter(word => 
    word.length >= 2 && 
    /[a-zA-Z]/.test(word) && 
    !/[^\w\s.,!?;:()\-]/.test(word)
  );
  
  const meaningfulRatio = words.length > 0 ? meaningfulWords.length / words.length : 0;
  
  // Text is readable if most characters are readable and most words are meaningful
  return readableRatio > 0.7 && meaningfulRatio > 0.5;
}

// Enhanced PDF text extraction using multiple approaches
async function extractTextFromPDF(pdfBuffer: Uint8Array): Promise<string> {
  try {
    console.log('Attempting PDF text extraction...');
    
    // Convert to string for text-based PDFs
    const pdfText = new TextDecoder('utf-8', { fatal: false }).decode(pdfBuffer);
    
    // Method 1: Look for readable text in streams (for text-based PDFs)
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let extractedTexts: string[] = [];
    let match;
    
    while ((match = streamRegex.exec(pdfText)) !== null) {
      const streamContent = match[1];
      
      // Look for readable text patterns in the stream
      const readableMatches = streamContent.match(/[a-zA-Z][a-zA-Z0-9\s.,!?;:()\-]{5,}/g);
      if (readableMatches) {
        extractedTexts.push(...readableMatches);
      }
    }
    
    // Method 2: Extract text from PDF text objects (Tj operators)
    const textObjectRegex = /BT\s+([\s\S]*?)\s+ET/g;
    let textObjectMatch;
    
    while ((textObjectMatch = textObjectRegex.exec(pdfText)) !== null) {
      const textObject = textObjectMatch[1];
      
      // Extract text from Tj operators with parentheses
      const tjMatches = textObject.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tjMatch of tjMatches) {
          const textMatch = tjMatch.match(/\(([^)]*)\)/);
          if (textMatch && textMatch[1]) {
            let text = textMatch[1];
            // Basic PDF text decoding
            text = text
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
            
            if (text.length > 2 && /[a-zA-Z]/.test(text)) {
              extractedTexts.push(text);
            }
          }
        }
      }
    }
    
    // Method 3: Look for any readable text patterns in the entire PDF
    const generalTextMatches = pdfText.match(/[a-zA-Z][a-zA-Z0-9\s.,!?;:()\-]{10,}/g);
    if (generalTextMatches) {
      extractedTexts.push(...generalTextMatches.slice(0, 50)); // Limit to avoid too much noise
    }
    
    // Combine and clean the extracted text
    let finalText = extractedTexts
      .filter(text => text && text.trim().length > 2)
      .join(' ')
      .trim();
    
    // Remove excessive whitespace and normalize
    finalText = finalText
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()\-]/g, ' ')
      .trim();
    
    // Validate if the extracted text is readable
    if (finalText && isTextReadable(finalText)) {
      console.log(`Successfully extracted ${finalText.length} characters of readable text`);
      return finalText;
    }
    
    // If no readable text found, return a message indicating image-based PDF
    console.log('No readable text found - likely an image-based PDF');
    return 'This appears to be an image-based PDF. Text extraction requires OCR processing.';
    
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'PDF text extraction failed. This may be an image-based PDF requiring OCR processing.';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, filename } = await req.json();
    
    if (!fileContent) {
      throw new Error('No file content provided');
    }
    
    console.log(`Extracting text from PDF: ${filename}`);
    
    // Convert base64 to Uint8Array
    const binaryData = atob(fileContent);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    const extractedText = await extractTextFromPDF(bytes);
    
    console.log(`Extracted ${extractedText.length} characters from PDF`);
    
    return new Response(JSON.stringify({
      success: true,
      extractedText,
      wordCount: extractedText.split(/\s+/).length,
      characterCount: extractedText.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in pdf-text-extractor function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});