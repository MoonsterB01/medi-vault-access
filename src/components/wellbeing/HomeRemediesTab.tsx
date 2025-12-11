import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Leaf, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface HomeRemedy {
  id: string;
  title: string;
  category: string;
  description: string | null;
  ingredients: string[];
  instructions: string | null;
  precautions: string | null;
  tags: string[];
  is_verified: boolean;
}

const CATEGORIES = [
  'All', 'Cold & Cough', 'Immunity', 'Digestion', 'Skin Care', 
  'Hair Care', 'Weight Management', 'Oral Health'
];

export function HomeRemediesTab() {
  const [remedies, setRemedies] = useState<HomeRemedy[]>([]);
  const [filteredRemedies, setFilteredRemedies] = useState<HomeRemedy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRemedy, setSelectedRemedy] = useState<HomeRemedy | null>(null);

  useEffect(() => {
    fetchRemedies();
  }, []);

  useEffect(() => {
    filterRemedies();
  }, [searchQuery, selectedCategory, remedies]);

  const fetchRemedies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_remedies')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      
      // Parse ingredients from JSON if needed
      const parsedRemedies = (data || []).map(remedy => ({
        ...remedy,
        ingredients: Array.isArray(remedy.ingredients) 
          ? remedy.ingredients 
          : (remedy.ingredients as any) || []
      }));
      
      setRemedies(parsedRemedies);
    } catch (error) {
      console.error('Error fetching remedies:', error);
      toast.error('Failed to load home remedies');
    } finally {
      setIsLoading(false);
    }
  };

  const filterRemedies = () => {
    let filtered = remedies;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query) ||
        r.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredRemedies(filtered);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search remedies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Remedies Grid */}
      {filteredRemedies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Leaf className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No remedies found</p>
            <p className="text-sm text-muted-foreground">Try a different search or category</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRemedies.map((remedy) => (
            <Card 
              key={remedy.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedRemedy(remedy)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{remedy.title}</CardTitle>
                    <CardDescription>{remedy.category}</CardDescription>
                  </div>
                  {remedy.is_verified && (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {remedy.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {remedy.tags?.slice(0, 3).map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remedy Detail Dialog */}
      <Dialog open={!!selectedRemedy} onOpenChange={() => setSelectedRemedy(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedRemedy && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-green-600" />
                  <DialogTitle>{selectedRemedy.title}</DialogTitle>
                </div>
                <DialogDescription className="flex items-center gap-2">
                  {selectedRemedy.category}
                  {selectedRemedy.is_verified && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {/* Description */}
                {selectedRemedy.description && (
                  <div>
                    <h4 className="font-medium mb-1">About</h4>
                    <p className="text-sm text-muted-foreground">{selectedRemedy.description}</p>
                  </div>
                )}

                {/* Ingredients */}
                {selectedRemedy.ingredients && selectedRemedy.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Ingredients</h4>
                    <ul className="text-sm space-y-1">
                      {selectedRemedy.ingredients.map((ingredient, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {selectedRemedy.instructions && (
                  <div>
                    <h4 className="font-medium mb-1">How to Use</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedRemedy.instructions}
                    </p>
                  </div>
                )}

                {/* Precautions */}
                {selectedRemedy.precautions && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <h4 className="font-medium">Precautions</h4>
                    </div>
                    <p className="text-sm text-yellow-600 dark:text-yellow-300">
                      {selectedRemedy.precautions}
                    </p>
                  </div>
                )}

                {/* Tags */}
                {selectedRemedy.tags && selectedRemedy.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2">
                    {selectedRemedy.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
