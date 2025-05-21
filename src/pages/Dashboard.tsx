
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Clock, TrendingUp, Eye, History } from "lucide-react";
import { dashboardData } from "@/lib/mock-data";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { remainingScans, totalScans, planType, recentScans } = dashboardData;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 mb-6 md:mb-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dashboard</CardTitle>
                <CardDescription>Your account & scans</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs 
                  defaultValue="overview" 
                  orientation="vertical" 
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="w-full"
                >
                  <TabsList className="flex flex-row md:flex-col h-auto md:h-auto justify-start">
                    <TabsTrigger value="overview" className="flex items-center gap-2 w-full justify-start">
                      <TrendingUp className="h-4 w-4" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="scans" className="flex items-center gap-2 w-full justify-start">
                      <History className="h-4 w-4" /> Recent Scans
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/">
                    New Scan
                  </Link>
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Your Plan</CardTitle>
                <Badge>{planType}</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span>Remaining Scans</span>
                    <span className="font-medium">{remainingScans} / {totalScans}</span>
                  </div>
                  <Progress value={(remainingScans / totalScans) * 100} />
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/pricing">
                    Upgrade Plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <TabsContent value="overview" className={`${activeTab === 'overview' ? 'block' : 'hidden'}`}>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <Card className="flex-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {recentScans.length > 0
                          ? `Last scan: ${formatDate(recentScans[0].time)}`
                          : "No recent scans"}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="flex-1">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Usage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {remainingScans} of {totalScans} Pro scans remaining
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Scans</CardTitle>
                    <CardDescription>Your latest token analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentScans.length > 0 ? (
                      <div className="space-y-4">
                        {recentScans.slice(0, 3).map((scan) => (
                          <div 
                            key={scan.id} 
                            className="flex justify-between items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <h3 className="font-medium">{scan.token}</h3>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(scan.time)}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <Badge className={`${scan.score >= 80 ? 'bg-success hover:bg-success/80' : 
                                scan.score >= 60 ? 'bg-info hover:bg-info/80' : 
                                scan.score >= 40 ? 'bg-warning hover:bg-warning/80' : 
                                'bg-danger hover:bg-danger/80'}`}
                              >
                                Score: {scan.score}
                              </Badge>
                              
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/scan-result?token=${scan.id}`} className="flex items-center gap-1">
                                  <Eye className="h-3.5 w-3.5" /> View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No scan history yet</p>
                        <Button className="mt-4" asChild>
                          <Link to="/">Scan Your First Token</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => setActiveTab("scans")}>
                      View All Scans
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="scans" className={`${activeTab === 'scans' ? 'block' : 'hidden'}`}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Scan History</CardTitle>
                  <CardDescription>All your previous token scans</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentScans.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Token</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentScans.map((scan) => (
                          <TableRow key={scan.id}>
                            <TableCell className="font-medium">{scan.token}</TableCell>
                            <TableCell>{formatDate(scan.time)}</TableCell>
                            <TableCell>
                              <Badge className={`${scan.score >= 80 ? 'bg-success hover:bg-success/80' : 
                                scan.score >= 60 ? 'bg-info hover:bg-info/80' : 
                                scan.score >= 40 ? 'bg-warning hover:bg-warning/80' : 
                                'bg-danger hover:bg-danger/80'}`}
                              >
                                {scan.score}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                <Link to={`/scan-result?token=${scan.id}`}>
                                  <ArrowUpRight className="h-4 w-4" />
                                  <span className="sr-only">View scan</span>
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No scan history yet</p>
                      <Button className="mt-4" asChild>
                        <Link to="/">Scan Your First Token</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
