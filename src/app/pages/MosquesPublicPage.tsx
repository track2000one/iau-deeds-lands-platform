import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  LogIn,
  MapPin,
  MessageSquare,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { mosquePublicApi, type PublicMosqueSite } from '../api/mosques';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const ticketTypes = {
  cleaning: 'مشكلة نظافة', electrical: 'عطل كهرباء', air_conditioning: 'عطل مكيف', audio: 'مشكلة صوتيات',
  supplies: 'نقص مستلزمات', general: 'ملاحظة عامة', complaint: 'شكوى', other: 'أخرى',
};
const jobTypes = { imam: 'إمام', muezzin: 'مؤذن', khateeb: 'خطيب', collaborator: 'متعاون', administrative: 'وظيفة إدارية' };
const statusLabels: Record<string, string> = {
  new: 'جديد', under_review: 'تحت المراجعة', assigned: 'مسند', in_progress: 'قيد التنفيذ', resolved: 'تم الحل', closed: 'مغلق', rejected: 'مرفوض',
  shortlisted: 'مرشح مبدئيًا', interview: 'مقابلة', accepted: 'مقبول', archived: 'مؤرشف',
};
const shell = 'border-slate-200/90 bg-gradient-to-b from-white to-sky-50/45 shadow-[0_7px_0_rgba(51,65,85,0.09),0_16px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,1)]';

export const MosquesPublicPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qrSiteToken = params.get('site') || '';
  const [sites, setSites] = useState<PublicMosqueSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketSaving, setTicketSaving] = useState(false);
  const [jobSaving, setJobSaving] = useState(false);
  const [ticketResult, setTicketResult] = useState<{ ticketNumber: string; trackingToken: string } | null>(null);
  const [jobResult, setJobResult] = useState<{ applicationNumber: string; trackingToken: string } | null>(null);
  const [ticketTrackToken, setTicketTrackToken] = useState('');
  const [ticketTrackResult, setTicketTrackResult] = useState<any>(null);
  const [jobTrackToken, setJobTrackToken] = useState('');
  const [jobTrackResult, setJobTrackResult] = useState<any>(null);

  const [ticketForm, setTicketForm] = useState({ siteToken: qrSiteToken, ticketType: 'general', description: '', reporterName: '', reporterPhone: '', reporterEmail: '', file: null as File | null });
  const [jobForm, setJobForm] = useState({ fullName: '', nationalId: '', phone: '', email: '', qualification: '', experience: '', jobType: 'imam', preferredLocation: '', cv: null as File | null, certificate: null as File | null });

  useEffect(() => {
    mosquePublicApi.sites().then((data) => {
      setSites(data);
      if (!ticketForm.siteToken && data[0]) setTicketForm((current) => ({ ...current, siteToken: data[0].publicToken }));
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل المواقع')).finally(() => setLoading(false));
  }, []);

  const selectedSite = sites.find((site) => site.publicToken === ticketForm.siteToken);
  const mapSites = sites.filter((site) => site.latitude != null && site.longitude != null);
  const mapCenter: [number, number] = useMemo(() => {
    if (selectedSite?.latitude != null && selectedSite?.longitude != null) return [Number(selectedSite.latitude), Number(selectedSite.longitude)];
    if (!mapSites.length) return [26.3927, 50.0438];
    return [mapSites.reduce((sum, item) => sum + Number(item.latitude), 0) / mapSites.length, mapSites.reduce((sum, item) => sum + Number(item.longitude), 0) / mapSites.length];
  }, [selectedSite, mapSites.length]);

  const submitTicket = async () => {
    if (!ticketForm.siteToken || ticketForm.description.trim().length < 5) return toast.error('اختر المسجد واكتب وصفًا واضحًا للبلاغ');
    setTicketSaving(true);
    try {
      const data = new FormData();
      Object.entries(ticketForm).forEach(([key, value]) => { if (key !== 'file' && value) data.append(key, String(value)); });
      if (ticketForm.file) data.append('file', ticketForm.file);
      const result = await mosquePublicApi.submitTicket(data);
      setTicketResult(result);
      setTicketTrackToken(result.trackingToken);
      toast.success('تم استلام البلاغ بنجاح');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إرسال البلاغ'); } finally { setTicketSaving(false); }
  };

  const trackTicket = async () => {
    if (!ticketTrackToken.trim()) return toast.error('أدخل رمز المتابعة');
    try { setTicketTrackResult(await mosquePublicApi.trackTicket(ticketTrackToken.trim())); } catch (error) { setTicketTrackResult(null); toast.error(error instanceof Error ? error.message : 'تعذر متابعة البلاغ'); }
  };

  const submitJob = async () => {
    if (!jobForm.fullName || !jobForm.nationalId || !jobForm.phone || !jobForm.email || !jobForm.qualification) return toast.error('أكمل الحقول الأساسية في طلب التوظيف');
    setJobSaving(true);
    try {
      const data = new FormData();
      Object.entries(jobForm).forEach(([key, value]) => { if (!['cv', 'certificate'].includes(key) && value) data.append(key, String(value)); });
      if (jobForm.cv) data.append('cv', jobForm.cv);
      if (jobForm.certificate) data.append('certificate', jobForm.certificate);
      const result = await mosquePublicApi.submitJob(data);
      setJobResult(result);
      setJobTrackToken(result.trackingToken);
      toast.success('تم استلام طلب التوظيف');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'تعذر إرسال الطلب'); } finally { setJobSaving(false); }
  };

  const trackJob = async () => {
    if (!jobTrackToken.trim()) return toast.error('أدخل رمز متابعة طلب التوظيف');
    try { setJobTrackResult(await mosquePublicApi.trackJob(jobTrackToken.trim())); } catch (error) { setJobTrackResult(null); toast.error(error instanceof Error ? error.message : 'تعذر متابعة الطلب'); }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_85%_0%,rgba(14,165,233,.12),transparent_30%),linear-gradient(180deg,#fbfdff_0%,#eff8fb_100%)] p-3 sm:p-5 md:p-8" dir="rtl">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <header className="overflow-hidden rounded-[30px] border border-sky-200/70 bg-white/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,.09)] backdrop-blur md:p-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">خدمات عامة بدون تسجيل دخول</Badge>{qrSiteToken && <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">تم فتح الصفحة عبر QR</Badge>}</div>
              <h1 className="text-2xl font-black text-slate-900 md:text-4xl">وحدة العناية بالمساجد والمصليات الجامعية</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">خدمات البلاغات، متابعة الحالة، طلبات التعاون والتوظيف، ومواقع المساجد والمصليات داخل الجامعة.</p>
            </div>
            <Button variant="outline" className="shadow-[0_4px_0_rgba(71,85,105,.14)]" onClick={() => navigate('/login')}><LogIn className="ml-2 h-4 w-4" />دخول منسوبي الوحدة</Button>
          </div>
        </header>

        {selectedSite && qrSiteToken && <Card className={`${shell} border-sky-300`}><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><MapPin className="h-6 w-6" /></div><div><p className="text-xs text-muted-foreground">الموقع المرتبط بالرمز</p><h2 className="text-xl font-black">{selectedSite.name}</h2><p className="text-sm text-muted-foreground">{selectedSite.city || ''} — {selectedSite.district || ''}</p></div></CardContent></Card>}

        <Tabs defaultValue={qrSiteToken ? 'report' : 'locations'} className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white p-2"><TabsTrigger value="report">تقديم بلاغ</TabsTrigger><TabsTrigger value="track">متابعة بلاغ</TabsTrigger><TabsTrigger value="jobs">التوظيف / التعاون</TabsTrigger><TabsTrigger value="track-job">متابعة التوظيف</TabsTrigger><TabsTrigger value="locations">المواقع</TabsTrigger></TabsList>

          <TabsContent value="report">
            <Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />تقديم بلاغ أو شكوى</CardTitle><CardDescription>سيصدر رقم بلاغ ورمز متابعة خاص. بيانات التواصل اختيارية.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="المسجد / المصلى"><NativeSelect value={ticketForm.siteToken} onChange={(e) => setTicketForm({ ...ticketForm, siteToken: e.target.value })} disabled={Boolean(qrSiteToken)}>{sites.map((site) => <option key={site.publicToken} value={site.publicToken}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع البلاغ"><NativeSelect value={ticketForm.ticketType} onChange={(e) => setTicketForm({ ...ticketForm, ticketType: e.target.value })}>{Object.entries(ticketTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</NativeSelect></Field><div className="md:col-span-2"><Field label="وصف البلاغ *"><Textarea rows={5} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="اشرح المشكلة باختصار ووضوح..." /></Field></div><Field label="الاسم (اختياري)"><Input value={ticketForm.reporterName} onChange={(e) => setTicketForm({ ...ticketForm, reporterName: e.target.value })} /></Field><Field label="الجوال (اختياري)"><Input value={ticketForm.reporterPhone} onChange={(e) => setTicketForm({ ...ticketForm, reporterPhone: e.target.value })} /></Field><Field label="البريد الإلكتروني (اختياري)"><Input type="email" value={ticketForm.reporterEmail} onChange={(e) => setTicketForm({ ...ticketForm, reporterEmail: e.target.value })} /></Field><Field label="صورة أو PDF"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setTicketForm({ ...ticketForm, file: e.target.files?.[0] || null })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={submitTicket} disabled={ticketSaving}><Send className="ml-2 h-4 w-4" />{ticketSaving ? 'جاري الإرسال...' : 'إرسال البلاغ'}</Button></div>{ticketResult && <div className="md:col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" />تم استلام بلاغكم</div><p className="mt-2">رقم البلاغ: <strong>{ticketResult.ticketNumber}</strong></p><p className="mt-1 break-all text-sm">رمز المتابعة: <strong dir="ltr">{ticketResult.trackingToken}</strong></p><p className="mt-2 text-xs text-emerald-800">احتفظ برمز المتابعة؛ فهو أكثر أمانًا من البحث برقم تسلسلي يمكن تخمينه.</p></div>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="track"><TrackCard title="متابعة البلاغ" token={ticketTrackToken} onToken={setTicketTrackToken} onSearch={trackTicket} result={ticketTrackResult} /></TabsContent>

          <TabsContent value="jobs"><Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />طلب توظيف أو تعاون مع الوحدة</CardTitle><CardDescription>بيانات المتقدم تحفظ كبيانات داخلية ولا تظهر للزوار.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="الاسم الكامل *"><Input value={jobForm.fullName} onChange={(e) => setJobForm({ ...jobForm, fullName: e.target.value })} /></Field><Field label="رقم الهوية *"><Input value={jobForm.nationalId} onChange={(e) => setJobForm({ ...jobForm, nationalId: e.target.value })} /></Field><Field label="رقم الجوال *"><Input value={jobForm.phone} onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })} /></Field><Field label="البريد الإلكتروني *"><Input type="email" value={jobForm.email} onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })} /></Field><Field label="المؤهل العلمي *"><Input value={jobForm.qualification} onChange={(e) => setJobForm({ ...jobForm, qualification: e.target.value })} /></Field><Field label="نوع المهمة / الوظيفة"><NativeSelect value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}>{Object.entries(jobTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</NativeSelect></Field><Field label="الخبرات"><Textarea value={jobForm.experience} onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })} /></Field><Field label="الموقع المفضل"><Input value={jobForm.preferredLocation} onChange={(e) => setJobForm({ ...jobForm, preferredLocation: e.target.value })} /></Field><Field label="السيرة الذاتية"><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setJobForm({ ...jobForm, cv: e.target.files?.[0] || null })} /></Field><Field label="شهادة / مرفق"><Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setJobForm({ ...jobForm, certificate: e.target.files?.[0] || null })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={submitJob} disabled={jobSaving}><Send className="ml-2 h-4 w-4" />{jobSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></div>{jobResult && <div className="md:col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><p className="font-bold text-emerald-800">تم استلام الطلب رقم {jobResult.applicationNumber}</p><p className="mt-2 break-all text-sm">رمز المتابعة: <strong dir="ltr">{jobResult.trackingToken}</strong></p></div>}</CardContent></Card></TabsContent>

          <TabsContent value="track-job"><TrackCard title="متابعة طلب التوظيف" token={jobTrackToken} onToken={setJobTrackToken} onSearch={trackJob} result={jobTrackResult} /></TabsContent>

          <TabsContent value="locations" className="space-y-4"><Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />خريطة المساجد والمصليات</CardTitle></CardHeader><CardContent>{loading ? <p>جاري التحميل...</p> : <div className="h-[520px] overflow-hidden rounded-2xl border"><MapContainer key={`${mapCenter[0]}-${mapCenter[1]}-${sites.length}`} center={mapCenter} zoom={13} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />{mapSites.map((site) => <CircleMarker key={site.publicToken} center={[Number(site.latitude), Number(site.longitude)]} radius={10} pathOptions={{ fillOpacity: .85 }}><Popup><div dir="rtl"><strong>{site.name}</strong><div>{site.city || ''} — {site.district || ''}</div><button className="mt-2 underline" onClick={() => window.open(`https://www.google.com/maps?q=${site.latitude},${site.longitude}`, '_blank')}>فتح في Google Maps</button></div></Popup></CircleMarker>)}</MapContainer></div>}</CardContent></Card><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sites.map((site) => <Card key={site.publicToken} className={shell}><CardContent className="flex items-center gap-4 p-4"><div className="rounded-xl bg-sky-100 p-3 text-sky-700"><Building2 className="h-5 w-5" /></div><div className="min-w-0"><p className="font-bold">{site.name}</p><p className="text-xs text-muted-foreground">{site.city || '-'} — {site.district || '-'}</p></div></CardContent></Card>)}</div></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;

const TrackCard = ({ title, token, onToken, onSearch, result }: { title: string; token: string; onToken: (value: string) => void; onSearch: () => void; result: any }) => <Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />{title}</CardTitle><CardDescription>استخدم رمز المتابعة الخاص الذي ظهر بعد إرسال الطلب.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Input dir="ltr" value={token} onChange={(e) => onToken(e.target.value)} placeholder="رمز المتابعة" /><Button onClick={onSearch}><Search className="ml-2 h-4 w-4" />بحث</Button></div>{result && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5"><p className="font-black text-slate-800">{result.ticketNumber || result.applicationNumber}</p>{result.site?.name && <p className="mt-1 text-sm">الموقع: {result.site.name}</p>}<p className="mt-2"><Badge variant="outline" className="border-sky-300 bg-white text-sky-700">{statusLabels[result.status] || result.status}</Badge></p>{result.resolutionNote && <p className="mt-3 text-sm">ملاحظة المعالجة: {result.resolutionNote}</p>}</div>}</CardContent></Card>;
