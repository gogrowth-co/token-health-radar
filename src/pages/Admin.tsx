import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { FileText, Loader2, Plus, RefreshCw, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import PageTable from "@/components/cms/PageTable";
import { usePages } from "@/hooks/usePages";

export default function Admin() {
  const { pages, isLoading, deletePage, refreshOutputs } = usePages();
  return (
    <div className="flex min-h-screen flex-col">
      <Helmet>
        <title>CMS Admin - Token Health Scan</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <Navbar />
      <main className="container flex-1 px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /><h1 className="text-3xl font-bold">CMS Pages</h1></div>
            <p className="text-muted-foreground">Claude MCP is the primary source; use this dashboard for review and manual edits.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/admin/users"><Users className="mr-2 h-4 w-4" />Users</Link></Button>
            <Button variant="outline" onClick={() => refreshOutputs.mutate()} disabled={refreshOutputs.isPending}><RefreshCw className="mr-2 h-4 w-4" />Refresh outputs</Button>
            <Button asChild><Link to="/admin/new"><Plus className="mr-2 h-4 w-4" />New page</Link></Button>
          </div>
        </div>
        {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <PageTable pages={pages} onDelete={(page) => deletePage.mutate(page)} />}
      </main>
      <Footer />
    </div>
  );
}
