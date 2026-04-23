import { Link } from "react-router-dom";
import { Edit, ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface PageTableProps {
  pages: any[];
  onDelete: (page: any) => void;
}

export default function PageTable({ pages, onDelete }: PageTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell>
                <div className="font-medium">{page.title || page.slug}</div>
                <div className="text-sm text-muted-foreground">/publications/{page.localized_slug || page.slug}</div>
              </TableCell>
              <TableCell><Badge variant={page.status === "published" ? "default" : "secondary"}>{page.status}</Badge></TableCell>
              <TableCell>{page.category || "—"}</TableCell>
              <TableCell>{page.updated_at ? new Date(page.updated_at).toLocaleDateString() : "—"}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {page.status === "published" && (
                    <Button asChild variant="ghost" size="icon"><Link to={`/publications/${page.localized_slug || page.slug}`}><ExternalLink className="h-4 w-4" /></Link></Button>
                  )}
                  <Button asChild variant="ghost" size="icon"><Link to={`/admin/edit/${page.id}`}><Edit className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(page)} disabled={page.is_system_page}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!pages.length && <div className="p-8 text-center text-muted-foreground">No CMS pages yet.</div>}
    </div>
  );
}
