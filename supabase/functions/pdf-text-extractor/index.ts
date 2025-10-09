import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dynamic import for PDF.js with reliable CDN
async function getPDFLib() {
  const pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/+esm');
  
  // Configure worker for serverless environment using reliable CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
  
  return pdfjsLib;
}

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

// Enhanced PDF text extraction using PDF.js
async function extractTextFromPDF(pdfBuffer: Uint8Array): Promise<{
  text: string;
  hasEmbeddedText: boolean;
  requiresOCR: boolean;
  pageCount: number;
  confidence: number;
}> {
  try {
    console.log('Attempting PDF text extraction with PDF.js...');
    
    const pdfjsLib = await getPDFLib();
    
    // Load the PDF document with serverless-friendly options
    const loadingTask = pdfjsLib.getDocument({ 
      data: pdfBuffer,
      isEvalSupported: false,
      useSystemFonts: true
    });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`PDF has ${pageCount} pages`);
    
    let extractedText = '';
    let hasEmbeddedText = false;
    let totalTextLength = 0;
    
    // Process each page (limit to first 20 pages for performance)
    const pagesToProcess = Math.min(pageCount, 20);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text from the page
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .trim();
        
        if (pageText.length > 50) {
          hasEmbeddedText = true;
        }
        
        totalTextLength += pageText.length;
        extractedText += pageText + '\n\n';
        
        console.log(`Page ${i}: extracted ${pageText.length} characters`);
      } catch (pageError) {
        console.error(`Error processing page ${i}:`, pageError);
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();

    // Validate extracted text to prevent garbage data
    const isReadable = isTextReadable(extractedText);
    if (!isReadable) {
      console.warn(`Extracted text deemed unreadable (length: ${extractedText.length}). Resetting and flagging for OCR.`);
      extractedText = '';
      hasEmbeddedText = false; // If text isn't readable, we can't trust it's embedded
    }
    
    // Determine if OCR is required based on final state of text
    const requiresOCR = !hasEmbeddedText || extractedText.length < 100;
    
    // Calculate confidence based on text extraction quality
    let confidence = 0;
    if (isReadable && hasEmbeddedText && extractedText.length > 500) {
      confidence = 0.95;
    } else if (isReadable && hasEmbeddedText && extractedText.length > 100) {
      confidence = 0.75;
    } else if (isReadable && extractedText.length > 50) {
      confidence = 0.5;
    } else {
      confidence = 0.1;
    }
    
    console.log(`Extraction complete: ${extractedText.length} chars, readable: ${isReadable}, hasEmbeddedText: ${hasEmbeddedText}, requiresOCR: ${requiresOCR}`);
    
    return {
      text: extractedText,
      hasEmbeddedText,
      requiresOCR,
      pageCount,
      confidence
    };
    
  } catch (error) {
    console.error('PDF.js extraction error:', error);
    throw error;
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
    
    const result = await extractTextFromPDF(bytes);
    
    console.log(`Extraction complete: ${result.text.length} characters, requiresOCR: ${result.requiresOCR}`);
    
    return new Response(JSON.stringify({
      success: true,
      extractedText: result.text,
      hasEmbeddedText: result.hasEmbeddedText,
      requiresOCR: result.requiresOCR,
      pageCount: result.pageCount,
      confidence: result.confidence,
      wordCount: result.text.split(/\s+/).length,
      characterCount: result.text.length,
      processingMethod: result.hasEmbeddedText ? 'PDF.js Text Extraction' : 'No Embedded Text Detected'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in pdf-text-extractor function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false,
      requiresOCR: true // Fallback to OCR if text extraction fails
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
