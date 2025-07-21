import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Phone,
  Mail,
  Clock,
  Users,
  TrendingUp,
  Settings,
  MessageSquare,
  Star,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Filter,
  Search,
  CalendarDays,
  UserCheck,
  DollarSign
} from "lucide-react";

// Mock data - gerçek uygulamada API'den gelecek
const mockLeads = [
  {
    id: 1,
    name: "Ahmet Yılmaz",
    phone: "+90 532 123 45 67",
    email: "ahmet@email.com",
    treatment: "İmplant tedavisi",
    message: "Sol alt azı dişim çekildi, implant yaptırmak istiyorum. Fiyat bilgisi alabilir miyim?",
    date: "2024-01-20",
    status: "new",
    source: "Website"
  },
  {
    id: 2,
    name: "Fatma Demir",
    phone: "+90 505 987 65 43",
    email: "fatma@email.com",
    treatment: "Diş beyazlatma",
    message: "Ofis tipi beyazlatma fiyatları nedir?",
    date: "2024-01-19",
    status: "contacted",
    source: "Website"
  },
  {
    id: 3,
    name: "Mehmet Kaya",
    phone: "+90 543 567 89 12",
    email: "mehmet@email.com",
    treatment: "Ortodonti",
    message: "",
    date: "2024-01-18",
    status: "completed",
    source: "Website"
  }
];

const mockStats = {
  totalLeads: 156,
  newLeads: 23,
  monthlyPatients: 89,
  revenue: 125000,
  avgRating: 4.8,
  totalReviews: 1247
};

const ClinicPanel = () => {
  const { id } = useParams();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [leads, setLeads] = useState(mockLeads);
  const [filterStatus, setFilterStatus] = useState("all");

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500';
      case 'contacted': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new': return 'Yeni';
      case 'contacted': return 'Arandı';
      case 'completed': return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  };

  const filteredLeads = filterStatus === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === filterStatus);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Smile Center İstanbul - Admin Panel</h1>
              <p className="text-muted-foreground">Klinik yönetim paneli</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Aktif
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Ayarlar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="leads">Randevu Talepleri</TabsTrigger>
            <TabsTrigger value="clinic-info">Klinik Bilgileri</TabsTrigger>
            <TabsTrigger value="treatments">Tedaviler & Fiyatlar</TabsTrigger>
            <TabsTrigger value="analytics">Analizler</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Toplam Lead</p>
                      <p className="text-3xl font-bold text-primary">{mockStats.totalLeads}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Yeni Lead'ler</p>
                      <p className="text-3xl font-bold text-blue-600">{mockStats.newLeads}</p>
                    </div>
                    <UserCheck className="h-8 w-8 text-blue-600/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Bu Ay Hasta</p>
                      <p className="text-3xl font-bold text-green-600">{mockStats.monthlyPatients}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600/60" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Aylık Gelir</p>
                      <p className="text-3xl font-bold text-trust-gold">₺{mockStats.revenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-trust-gold/60" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Leads */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Leads */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Son Randevu Talepleri
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {leads.slice(0, 3).map((lead) => (
                      <div key={lead.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium">{lead.name}</h4>
                            <Badge variant="secondary" className={`text-white ${getStatusColor(lead.status)}`}>
                              {getStatusText(lead.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{lead.treatment}</p>
                          <p className="text-xs text-muted-foreground">{lead.date}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Calendar */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Takvim
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="İsim veya telefon ara..." className="pl-10 w-64" />
                    </div>
                    <select 
                      className="px-3 py-2 border border-border rounded-md bg-background"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">Tüm Durumlar</option>
                      <option value="new">Yeni</option>
                      <option value="contacted">Arandı</option>
                      <option value="completed">Tamamlandı</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Excel'e Aktar
                    </Button>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtrele
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-border/50">
                      <tr className="bg-muted/30">
                        <th className="p-4 text-left font-medium">Hasta</th>
                        <th className="p-4 text-left font-medium">İletişim</th>
                        <th className="p-4 text-left font-medium">Tedavi</th>
                        <th className="p-4 text-left font-medium">Tarih</th>
                        <th className="p-4 text-left font-medium">Durum</th>
                        <th className="p-4 text-left font-medium">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b border-border/30 hover:bg-muted/20">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{lead.name}</div>
                              <div className="text-sm text-muted-foreground">{lead.source}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-3 h-3" />
                                {lead.phone}
                              </div>
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="w-3 h-3" />
                                  {lead.email}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="max-w-xs">
                              <div className="font-medium text-sm">{lead.treatment}</div>
                              {lead.message && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  {lead.message}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-sm">{lead.date}</td>
                          <td className="p-4">
                            <Badge variant="secondary" className={`text-white ${getStatusColor(lead.status)}`}>
                              {getStatusText(lead.status)}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Phone className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Mail className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinic Info Tab */}
          <TabsContent value="clinic-info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Klinik Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Klinik Adı</label>
                    <Input defaultValue="Smile Center İstanbul" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Telefon</label>
                    <Input defaultValue="+90 (212) 123 45 67" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">E-posta</label>
                    <Input defaultValue="info@smilecenter.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Şehir</label>
                    <Input defaultValue="İstanbul" />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Adres</label>
                  <Textarea defaultValue="Levent Mahallesi, Büyükdere Caddesi No:145" />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Açıklama</label>
                  <Textarea 
                    defaultValue="İstanbul'un kalbi Levent'te yer alan Smile Center, 15 yıllık deneyimi ile en kaliteli diş tedavilerini sunmaktadır."
                    rows={4}
                  />
                </div>
                
                <Button className="bg-gradient-primary hover:opacity-90">
                  Bilgileri Güncelle
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other tabs would be implemented similarly */}
          <TabsContent value="treatments">
            <Card>
              <CardHeader>
                <CardTitle>Tedaviler ve Fiyatlar - Yakında</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Bu bölüm geliştiriliyor...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analizler - Yakında</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Bu bölüm geliştiriliyor...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClinicPanel;
