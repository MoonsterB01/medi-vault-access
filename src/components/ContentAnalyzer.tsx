import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Brain, CheckCircle, Loader2, Tag, Users, Stethoscope, Pill, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContentAnalyzerProps {
  documentId: string;
  filename: string;
  contentType: string;
  fileContent: string;
  onAnalysisComplete?: (analysis: AnalysisResult) => void;
}

interface AnalysisResult {
  keywords: string[];
  categories: string[];
  confidence: number;
  extractedText: string;
  entities?: any;
  entitiesCount?: number;
}

export function ContentAnalyzer({ 
  documentId, 
  filename, 
  contentType, 
  fileContent, 
  onAnalysisComplete 
}: ContentAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'analyze-document-content',
        {
          body: {
            documentId,
            filename,
            contentType,
            fileContent,
          }
        }
      );

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const result: AnalysisResult = {
        keywords: data.keywords || [],
        categories: data.categories || [],
        confidence: data.confidence || 0,
        extractedText: data.extractedText || '',
        entities: data.entities || {},
        entitiesCount: data.entitiesCount || 0,
      };

      setAnalysisResult(result);
      onAnalysisComplete?.(result);

      toast({
        title: "Analysis Complete",
        description: `Found ${result.keywords.length} keywords, ${result.categories.length} categories, and ${result.entitiesCount || 0} medical entities`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze document';
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Content Analysis
        </CardTitle>
        <CardDescription>
          AI-powered medical document analysis to extract keywords, categories, and medical entities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!analysisResult && !isAnalyzing && (
            <Button 
            onClick={handleAnalyze}
            className="w-full"
            disabled={isAnalyzing}
          >
            <Brain className="mr-2 h-4 w-4" />
            Analyze Medical Document
          </Button>
        )}

        {isAnalyzing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Analyzing medical content with AI...
              </span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Analysis Complete</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Confidence Score</span>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={analysisResult.confidence * 100} className="flex-1" />
                  <span className={`text-sm font-medium ${getConfidenceColor(analysisResult.confidence)}`}>
                    {getConfidenceLabel(analysisResult.confidence)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Content Found</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysisResult.extractedText ? 
                    `${Math.min(analysisResult.extractedText.length, 500)} characters` : 
                    'No text extracted'
                  }
                </p>
              </div>
            </div>

            {analysisResult.keywords.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Keywords ({analysisResult.keywords.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysisResult.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.categories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Categories ({analysisResult.categories.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysisResult.categories.map((category, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysisResult.extractedText && (
              <div>
                <span className="text-sm font-medium">Content Preview</span>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {analysisResult.extractedText}
                  </p>
                </div>
              </div>
            )}

            {analysisResult.entities && Object.keys(analysisResult.entities).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="h-4 w-4" />
                  <span className="text-sm font-medium">Medical Entities Found</span>
                </div>
                <div className="space-y-3">
                  {analysisResult.entities.doctors && analysisResult.entities.doctors.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Users className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Doctors</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.doctors.map((doctor: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            {doctor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.entities.conditions && analysisResult.entities.conditions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <AlertCircle className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Conditions</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.conditions.map((condition: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-red-100 text-red-700">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.entities.medications && analysisResult.entities.medications.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Pill className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Medications</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.medications.map((medication: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-700">
                            {medication}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.entities.tests && analysisResult.entities.tests.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Brain className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Tests</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.tests.map((test: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            {test}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.entities.dates && analysisResult.entities.dates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Important Dates</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.dates.map((date: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {date}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysisResult.entities.facilities && analysisResult.entities.facilities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-xs font-medium text-muted-foreground">Facilities</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.entities.facilities.map((facility: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                            {facility}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}