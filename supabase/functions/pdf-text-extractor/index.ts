import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple PDF text extraction using basic PDF structure parsing
async function extractTextFromPDF(pdfBuffer: Uint8Array): Promise<string> {
  try {
    const pdfText = new TextDecoder().decode(pdfBuffer);
    
    // Basic PDF text extraction - look for text objects
    const textRegex = /BT\s+.*?ET/gs;
    const textObjects = pdfText.match(textRegex) || [];
    
    const extractedText: string[] = [];
    
    for (const textObject of textObjects) {
      // Extract text from Tj operators
      const tjMatches = textObject.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const match of tjMatches) {
          const text = match.match(/\(([^)]*)\)/)?.[1];
          if (text) {
            // Decode basic PDF text encoding
            const decodedText = text
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\');
            extractedText.push(decodedText);
          }
        }
      }
      
      // Extract text from TJ operators (array format)
      const tjArrayMatches = textObject.match(/\[([^\]]*)\]\s*TJ/g);
      if (tjArrayMatches) {
        for (const match of tjArrayMatches) {
          const arrayContent = match.match(/\[([^\]]*)\]/)?.[1];
          if (arrayContent) {
            const stringMatches = arrayContent.match(/\(([^)]*)\)/g);
            if (stringMatches) {
              for (const stringMatch of stringMatches) {
                const text = stringMatch.match(/\(([^)]*)\)/)?.[1];
                if (text) {
                  extractedText.push(text);
                }
              }
            }
          }
        }
      }
    }
    
    let finalText = extractedText.join(' ').trim();
    
    // If basic extraction fails, try stream parsing
    if (!finalText || finalText.length < 10) {
      const streamRegex = /stream\s*(.*?)\s*endstream/gs;
      const streams = pdfText.match(streamRegex) || [];
      
      for (const stream of streams) {
        const streamContent = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
        // Look for readable text in streams
        const readableText = streamContent.match(/[a-zA-Z0-9\s.,!?;:()%-]{10,}/g);
        if (readableText) {
          finalText += ' ' + readableText.join(' ');
        }
      }
    }
    
    return finalText.trim() || 'PDF content could not be extracted';
  } catch (error) {
    console.error('PDF extraction error:', error);
    return 'PDF text extraction failed';
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

  } catch (error) {
    console.error('Error in pdf-text-extractor function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});