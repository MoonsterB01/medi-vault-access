import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FileText, 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2,
  Bot,
  Image,
  FileSpreadsheet
} from "lucide-react";
import { DocumentSummaryDialog } from "@/components/DocumentSummaryDialog";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  filename: string;
  file_size: number;
  uploaded_at: string;
  document_type: string;
  verification_status: string;
  ai_summary?: string;
  file_path: string;
}

interface DocumentTableProps {
  documents: Document[];
  onView: (doc: Document) => void;
  onDelete: (docId: string, filename: string) => void;
  className?: string;
}

export function DocumentTable({ documents, onView, onDelete, className }: DocumentTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const totalPages = Math.ceil(documents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDocuments = documents.slice(startIndex, endIndex);

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  };

  const formatDocumentType = (type: string) => {
    return type ? type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document';
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="h-4 w-4 text-primary" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="h-4 w-4 text-trust" />;
    }
    return <FileText className="h-4 w-4 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline"; dotColor: string }> = {
      verified: { label: 'Verified', variant: 'default', dotColor: 'bg-trust' },
      unverified: { label: 'Pending', variant: 'secondary', dotColor: 'bg-warning' },
      rejected: { label: 'Rejected', variant: 'outline', dotColor: 'bg-destructive' },
    };
    const config = statusConfig[status] || statusConfig.unverified;
    
    return (
      <div className="flex items-center gap-2">
        <span className={cn("w-2 h-2 rounded-full", config.dotColor)} />
        <span className="text-sm text-muted-foreground">{config.label}</span>
      </div>
    );
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No documents found</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[40%]">Document Name</TableHead>
              <TableHead>Date Uploaded</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentDocuments.map((doc) => (
              <TableRow key={doc.id} className="group">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      {getFileIcon(doc.filename)}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[200px]">{doc.filename}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {formatDocumentType(doc.document_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {getStatusBadge(doc.verification_status)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onView(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {doc.ai_summary && (
                      <DocumentSummaryDialog document={doc}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Bot className="h-4 w-4" />
                        </Button>
                      </DocumentSummaryDialog>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(doc)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onDelete(doc.id, doc.filename)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, documents.length)} of {documents.length}
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
