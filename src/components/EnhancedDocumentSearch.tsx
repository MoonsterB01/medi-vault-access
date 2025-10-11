import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, Download, FileText, Calendar, Tag, Brain, Star } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

/**
 * @interface SearchResult
 * @description Defines the structure of a search result object.
 */
interface SearchResult {
  id: string;
  filename: string;
  document_type: string;
  description: string;
  uploaded_at: string;
  patient_id: string;
  patient_name: string;
  content_keywords: string[];
  auto_categories: string[];
  content_confidence: number;
  relevance_score: number;
  matched_keywords: string[];
  file_url?: string;
}

/**
 * @interface SearchMetadata
 * @description Defines the structure of the search metadata object.
 * @property {boolean} hasContentAnalysis - Indicates if the search results have content analysis data.
 * @property {number} avgConfidence - The average confidence score of the search results.
 */
interface SearchMetadata {
  hasContentAnalysis: boolean;
  avgConfidence: number;
}

/**
 * @interface EnhancedDocumentSearchProps
 * @description Defines the props for the EnhancedDocumentSearch component.
 * @property {string} [patientId] - The ID of the patient to filter documents for.
 * @property {(document: SearchResult) => void} [onDocumentSelect] - An optional callback function to be called when a document is selected.
 */
interface EnhancedDocumentSearchProps {
  patientId?: string;
  onDocumentSelect?: (document: SearchResult) => void;
}

/**
 * @function EnhancedDocumentSearch
 * @description A component for performing an enhanced search of medical documents. It allows searching by content, keywords, categories, and other metadata.
 * @param {EnhancedDocumentSearchProps} props - The props for the component.
 * @returns {JSX.Element} - The rendered EnhancedDocumentSearch component.
 */
export function EnhancedDocumentSearch({ patientId, onDocumentSelect }: EnhancedDocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [documentType, setDocumentType] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMetadata, setSearchMetadata] = useState<SearchMetadata | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Load available categories
    loadAvailableCategories();
  }, []);

  useEffect(() => {
    // Auto-search with debouncing
    const timeoutId = setTimeout(() => {
      if (query.trim() || documentType || selectedCategories.length > 0) {
        handleSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [query, documentType, selectedCategories, patientId]);

  const loadAvailableCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('content_categories')
        .select('name')
        .order('name');

      if (error) throw error;

      setAvailableCategories(data.map(cat => cat.name));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSearch = async () => {
    setIsSearching(true);

    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('enhanced-search', {
        body: {
          query: query.trim(),
          userId: user.data.user.id,
          patientId,
          documentType: documentType && documentType !== 'all_types' ? documentType : undefined,
          categories: selectedCategories.length > 0 ? selectedCategories : undefined,
          limit: 50,
          offset: 0,
        }
      });

      if (error) throw error;

      setResults(data.documents || []);
      setSearchMetadata(data.searchMetadata || null);

      if (data.documents?.length === 0 && query.trim()) {
        toast({
          title: "No Results Found",
          description: "Try adjusting your search terms or filters",
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : 'Failed to search documents',
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setDocumentType('');
    setSelectedCategories([]);
    setResults([]);
  };

  const getRelevanceStars = (score: number) => {
    const stars = Math.max(1, Math.min(5, Math.ceil(score / 20)));
    return Array.from({ length: stars }, (_, i) => (
      <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Enhanced Document Search
          </CardTitle>
          <CardDescription>
            Search documents by content, keywords, categories, and metadata
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search document content, keywords, or descriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Document Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_types">All Types</SelectItem>
                  <SelectItem value="lab_result">Lab Result</SelectItem>
                  <SelectItem value="prescription">Prescription</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="discharge">Discharge Summary</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Categories:</p>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map(category => (
                  <Badge
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Metadata */}
          {searchMetadata && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Brain className="h-4 w-4" />
                <span>
                  {searchMetadata.hasContentAnalysis ? 'AI Analysis Available' : 'Basic Search'}
                </span>
              </div>
              {searchMetadata.hasContentAnalysis && (
                <div>
                  Avg Confidence: {Math.round(searchMetadata.avgConfidence * 100)}%
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        {isSearching && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Searching...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Search Results ({results.length})</h3>
            </div>

            {results.map((doc) => (
              <Card 
                key={doc.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onDocumentSelect?.(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{doc.filename}</h4>
                        <div className="flex items-center gap-1">
                          {getRelevanceStars(doc.relevance_score)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Patient: {doc.patient_name}</span>
                        <span>Type: {doc.document_type || 'Unknown'}</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.uploaded_at), 'MMM dd, yyyy')}
                        </div>
                      </div>

                      {doc.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.description}
                        </p>
                      )}

                      {/* Content Keywords */}
                      {doc.content_keywords.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {doc.content_keywords.slice(0, 5).map((keyword, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                            {doc.content_keywords.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{doc.content_keywords.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Auto Categories */}
                      {doc.auto_categories.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Brain className="h-3 w-3 text-muted-foreground" />
                          <div className="flex flex-wrap gap-1">
                            {doc.auto_categories.map((category, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                className="text-xs"
                              >
                                {category}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Matched Keywords */}
                      {doc.matched_keywords.length > 0 && (
                        <div className="text-xs text-green-600">
                          Matched: {doc.matched_keywords.join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {doc.content_confidence > 0 && (
                        <Badge variant="secondary">
                          {Math.round(doc.content_confidence * 100)}% confidence
                        </Badge>
                      )}
                      
                      {doc.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(doc.file_url, '_blank');
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isSearching && results.length === 0 && (query || documentType || selectedCategories.length > 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No documents found matching your search criteria.</p>
                <p className="text-sm mt-2">Try adjusting your search terms or filters.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}