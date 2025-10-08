import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dynamic import for PDF.js
async function getPDFLib() {
  const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
  return pdfjsLib;
}

// Dynamic import for canvas
async function getCanvas() {
  const { createCanvas } = await import('https://deno.land/x/canvas@v1.4.1/mod.ts');
  return createCanvas;
}

// Convert PDF pages to images
async function convertPDFToImages(pdfBuffer: Uint8Array, maxPages: number = 20): Promise<string[]> {
  try {
    console.log('Converting PDF to images...');
    
    const pdfjsLib = await getPDFLib();
    const createCanvas = await getCanvas();
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
    const pdf = await loadingTask.promise;
    
    const pageCount = pdf.numPages;
    console.log(`PDF has ${pageCount} pages, processing up to ${maxPages}`);
    
    const images: string[] = [];
    const pagesToProcess = Math.min(pageCount, maxPages);
    
    for (let i = 1; i <= pagesToProcess; i++) {
      try {
        const page = await pdf.getPage(i);
        
        // Set scale for higher quality (2.0 = 144 DPI, good for OCR)
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render the page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        // Convert canvas to data URL (PNG format for best quality)
        const imageData = canvas.toDataURL('image/png');
        images.push(imageData);
        
        console.log(`Converted page ${i}/${pagesToProcess}`);
      } catch (pageError) {
        console.error(`Error converting page ${i}:`, pageError);
        // Continue with other pages even if one fails
      }
    }
    
    console.log(`Successfully converted ${images.length} pages to images`);
    return images;
    
  } catch (error) {
    console.error('PDF to images conversion error:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileContent, filename, maxPages } = await req.json();
    
    if (!fileContent) {
      throw new Error('No file content provided');
    }
    
    console.log(`Converting PDF to images: ${filename}`);
    
    // Convert base64 to Uint8Array
    const binaryData = atob(fileContent);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }
    
    const images = await convertPDFToImages(bytes, maxPages || 20);
    
    return new Response(JSON.stringify({
      success: true,
      images,
      pageCount: images.length,
      message: `Successfully converted ${images.length} pages to images`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in pdf-to-images function:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
