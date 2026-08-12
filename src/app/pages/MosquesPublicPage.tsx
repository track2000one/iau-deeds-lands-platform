import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Briefcase,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  LogIn,
  MapPin,
  MessageSquare,
  Pause,
  Play,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { mosquePublicApi, type PublicMosqueSite } from '../api/mosques';
import { getApiBaseUrl } from '../../lib/http';
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

type PublicGalleryItem = {
  id: string;
  title: string;
  imageUrl: string;
  sourcePage?: string | null;
  source?: string;
};

const fallbackSlides: PublicGalleryItem[] = [
  {
    id: 'fallback-mosque',
    title: 'مساجد ومصليات جامعة الإمام عبدالرحمن بن فيصل',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Imam_Abdulrahman_bin_Faisal_University_mosque.jpg/1280px-Imam_Abdulrahman_bin_Faisal_University_mosque.jpg',
    source: 'fallback',
  },
  {
    id: 'fallback-campus-1',
    title: 'جامعة الإمام عبدالرحمن بن فيصل',
    imageUrl: 'https://www.alyaum.com/uploads/images/2023/08/26/2056189.jpeg',
    source: 'fallback',
  },
  {
    id: 'fallback-campus-2',
    title: 'رحاب الجامعة',
    imageUrl: 'https://cdnx.premiumread.com/?f=webp&q=100&url=https%3A%2F%2Fwww.okaz.com.sa%2Fokaz%2Fuploads%2Fimages%2F2026%2F03%2F04%2F2672307.webp&w=830',
    source: 'fallback',
  },
];

export const MosquesPublicPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qrSiteToken = params.get('site') || '';
  const [sites, setSites] = useState<PublicMosqueSite[]>([]);
  const [galleryItems, setGalleryItems] = useState<PublicGalleryItem[]>([]);
  const [brokenSlides, setBrokenSlides] = useState<string[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
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
    let cancelled = false;
    mosquePublicApi.sites().then((data) => {
      if (cancelled) return;
      setSites(data);
      setTicketForm((current) => current.siteToken || !data[0] ? current : { ...current, siteToken: data[0].publicToken });
    }).catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات المساجد والمصليات'));

    const base = getApiBaseUrl();
    if (base) {
      fetch(`${base}/api/mosques/public/gallery`)
        .then(async (response) => response.ok ? response.json() : [])
        .then((data) => { if (!cancelled && Array.isArray(data)) setGalleryItems(data); })
        .catch(() => { if (!cancelled) setGalleryItems([]); });
    }
    return () => { cancelled = true; };
  }, []);

  const slides = useMemo(() => {
    const seen = new Set<string>();
    return [...galleryItems, ...fallbackSlides].filter((slide) => {
      const imageUrl = String(slide.imageUrl || '').trim();
      if (!imageUrl || brokenSlides.includes(slide.id) || seen.has(imageUrl)) return false;
      seen.add(imageUrl);
      return true;
    });
  }, [galleryItems, brokenSlides]);

  useEffect(() => {
    if (!slides.length) return;
    if (activeSlide >= slides.length) setActiveSlide(0);
  }, [slides.length, activeSlide]);

  useEffect(() => {
    if (galleryPaused || slides.length < 2) return;
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 5500);
    return () => window.clearInterval(timer);
  }, [galleryPaused, slides.length]);

  useEffect(() => {
    if (slides.length < 2) return;
    const next = slides[(activeSlide + 1) % slides.length];
    if (!next) return;
    const preloader = new window.Image();
    preloader.src = next.imageUrl;
  }, [activeSlide, slides]);

  const selectedSite = sites.find((site) => site.publicToken === ticketForm.siteToken);
  const currentSlide = slides[activeSlide] || fallbackSlides[0];
  const goToSlide = (index: number) => {
    if (!slides.length) return;
    setActiveSlide((index + slides.length) % slides.length);
  };

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_88%_0%,rgba(16,185,129,.10),transparent_28%),radial-gradient(circle_at_12%_12%,rgba(14,165,233,.08),transparent_26%),linear-gradient(180deg,#fbfdfc_0%,#f0f8f6_55%,#eef7fb_100%)] p-3 sm:p-5 md:p-8" dir="rtl">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <header className="overflow-hidden rounded-[30px] border border-emerald-200/70 bg-white/92 p-6 shadow-[0_18px_50px_rgba(15,23,42,.09)] backdrop-blur md:p-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap gap-2"><Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">خدمات عامة بدون تسجيل دخول</Badge>{qrSiteToken && <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">تم فتح الصفحة عبر QR</Badge>}</div>
              <h1 className="text-2xl font-black text-slate-900 md:text-4xl">وحدة العناية بالمساجد والمصليات الجامعية</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">واجهة تعريفية وخدمات إلكترونية للعناية ببيوت الله في جامعة الإمام عبدالرحمن بن فيصل، تشمل البلاغات والمتابعة وطلبات التعاون والتوظيف.</p>
            </div>
            <Button variant="outline" className="shadow-[0_4px_0_rgba(71,85,105,.14)]" onClick={() => navigate('/login')}><LogIn className="ml-2 h-4 w-4" />دخول منسوبي الوحدة</Button>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[32px] border border-white/80 bg-slate-950 shadow-[0_9px_0_rgba(15,57,95,.10),0_24px_54px_rgba(15,23,42,.18)]">
          <div className="relative h-[310px] sm:h-[420px] lg:h-[520px]">
            <img
              key={currentSlide.id}
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
              onError={() => setBrokenSlides((current) => current.includes(currentSlide.id) ? current : [...current, currentSlide.id])}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,20,24,.18),rgba(2,20,24,.08)_42%,rgba(2,20,24,.72)_100%),linear-gradient(180deg,rgba(2,20,24,.02)_35%,rgba(2,20,24,.72)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-5 text-white sm:p-8 lg:p-10">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-3 py-1.5 text-xs font-bold backdrop-blur-md"><Sparkles className="h-4 w-4" />بيوت الله في رحاب الجامعة</div>
                <h2 className="text-2xl font-black leading-tight drop-shadow-lg sm:text-4xl lg:text-5xl">{currentSlide.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/88 sm:text-base">العناية بالمساجد والمصليات الجامعية، وتهيئة بيئة إيمانية مناسبة لمنسوبي الجامعة وزوارها.</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="الصورة السابقة" onClick={() => goToSlide(activeSlide - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-black/20 backdrop-blur transition hover:bg-white/20"><ChevronRight className="h-5 w-5" /></button>
                  <button type="button" aria-label={galleryPaused ? 'تشغيل العرض التلقائي' : 'إيقاف العرض التلقائي'} onClick={() => setGalleryPaused((value) => !value)} className="grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-black/20 backdrop-blur transition hover:bg-white/20">{galleryPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>
                  <button type="button" aria-label="الصورة التالية" onClick={() => goToSlide(activeSlide + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/35 bg-black/20 backdrop-blur transition hover:bg-white/20"><ChevronLeft className="h-5 w-5" /></button>
                </div>
                <div className="flex max-w-[70%] items-center gap-1.5 overflow-hidden rounded-full border border-white/20 bg-black/18 px-3 py-2 backdrop-blur-md">
                  {slides.slice(0, 15).map((slide, index) => <button key={slide.id} type="button" aria-label={`الانتقال للصورة ${index + 1}`} onClick={() => goToSlide(index)} className={`h-2 rounded-full transition-all ${index === activeSlide ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/75'}`} />)}
                  <span className="mr-2 whitespace-nowrap text-[11px] font-bold text-white/80">{Math.min(activeSlide + 1, slides.length)} / {slides.length}</span>
                </div>
              </div>
            </div>
            <div className="absolute left-4 top-4 hidden items-center gap-2 rounded-full border border-white/35 bg-black/20 px-3 py-2 text-xs font-bold text-white backdrop-blur-md sm:flex"><ImageIcon className="h-4 w-4" />معرض الجامعة والمساجد</div>
          </div>
        </section>

        {selectedSite && qrSiteToken && <Card className={`${shell} border-sky-300`}><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-sky-100 p-3 text-sky-700"><MapPin className="h-6 w-6" /></div><div><p className="text-xs text-muted-foreground">المسجد / المصلى المرتبط بالرمز</p><h2 className="text-xl font-black">{selectedSite.name}</h2><p className="text-sm text-muted-foreground">{selectedSite.city || ''} — {selectedSite.district || ''}</p></div></CardContent></Card>}

        <Tabs defaultValue="report" className="space-y-4">
          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border bg-white p-2"><TabsTrigger value="report">تقديم بلاغ</TabsTrigger><TabsTrigger value="track">متابعة بلاغ</TabsTrigger><TabsTrigger value="jobs">التوظيف / التعاون</TabsTrigger><TabsTrigger value="track-job">متابعة التوظيف</TabsTrigger></TabsList>

          <TabsContent value="report">
            <Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />تقديم بلاغ أو شكوى</CardTitle><CardDescription>سيصدر رقم بلاغ ورمز متابعة خاص. بيانات التواصل اختيارية.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="المسجد / المصلى"><NativeSelect value={ticketForm.siteToken} onChange={(e) => setTicketForm({ ...ticketForm, siteToken: e.target.value })} disabled={Boolean(qrSiteToken)}>{sites.map((site) => <option key={site.publicToken} value={site.publicToken}>{site.name}</option>)}</NativeSelect></Field><Field label="نوع البلاغ"><NativeSelect value={ticketForm.ticketType} onChange={(e) => setTicketForm({ ...ticketForm, ticketType: e.target.value })}>{Object.entries(ticketTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</NativeSelect></Field><div className="md:col-span-2"><Field label="وصف البلاغ *"><Textarea rows={5} value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} placeholder="اشرح المشكلة باختصار ووضوح..." /></Field></div><Field label="الاسم (اختياري)"><Input value={ticketForm.reporterName} onChange={(e) => setTicketForm({ ...ticketForm, reporterName: e.target.value })} /></Field><Field label="الجوال (اختياري)"><Input value={ticketForm.reporterPhone} onChange={(e) => setTicketForm({ ...ticketForm, reporterPhone: e.target.value })} /></Field><Field label="البريد الإلكتروني (اختياري)"><Input type="email" value={ticketForm.reporterEmail} onChange={(e) => setTicketForm({ ...ticketForm, reporterEmail: e.target.value })} /></Field><Field label="صورة أو PDF"><Input type="file" accept="image/*,application/pdf" onChange={(e) => setTicketForm({ ...ticketForm, file: e.target.files?.[0] || null })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={submitTicket} disabled={ticketSaving}><Send className="ml-2 h-4 w-4" />{ticketSaving ? 'جاري الإرسال...' : 'إرسال البلاغ'}</Button></div>{ticketResult && <div className="md:col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" />تم استلام بلاغكم</div><p className="mt-2">رقم البلاغ: <strong>{ticketResult.ticketNumber}</strong></p><p className="mt-1 break-all text-sm">رمز المتابعة: <strong dir="ltr">{ticketResult.trackingToken}</strong></p><p className="mt-2 text-xs text-emerald-800">احتفظ برمز المتابعة؛ فهو أكثر أمانًا من البحث برقم تسلسلي يمكن تخمينه.</p></div>}</CardContent></Card>
          </TabsContent>

          <TabsContent value="track"><TrackCard title="متابعة البلاغ" token={ticketTrackToken} onToken={setTicketTrackToken} onSearch={trackTicket} result={ticketTrackResult} /></TabsContent>

          <TabsContent value="jobs"><Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" />طلب توظيف أو تعاون مع الوحدة</CardTitle><CardDescription>بيانات المتقدم تحفظ كبيانات داخلية ولا تظهر للزوار.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="الاسم الكامل *"><Input value={jobForm.fullName} onChange={(e) => setJobForm({ ...jobForm, fullName: e.target.value })} /></Field><Field label="رقم الهوية *"><Input value={jobForm.nationalId} onChange={(e) => setJobForm({ ...jobForm, nationalId: e.target.value })} /></Field><Field label="رقم الجوال *"><Input value={jobForm.phone} onChange={(e) => setJobForm({ ...jobForm, phone: e.target.value })} /></Field><Field label="البريد الإلكتروني *"><Input type="email" value={jobForm.email} onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })} /></Field><Field label="المؤهل العلمي *"><Input value={jobForm.qualification} onChange={(e) => setJobForm({ ...jobForm, qualification: e.target.value })} /></Field><Field label="نوع المهمة / الوظيفة"><NativeSelect value={jobForm.jobType} onChange={(e) => setJobForm({ ...jobForm, jobType: e.target.value })}>{Object.entries(jobTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</NativeSelect></Field><Field label="الخبرات"><Textarea value={jobForm.experience} onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })} /></Field><Field label="الموقع المفضل"><Input value={jobForm.preferredLocation} onChange={(e) => setJobForm({ ...jobForm, preferredLocation: e.target.value })} /></Field><Field label="السيرة الذاتية"><Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setJobForm({ ...jobForm, cv: e.target.files?.[0] || null })} /></Field><Field label="شهادة / مرفق"><Input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(e) => setJobForm({ ...jobForm, certificate: e.target.files?.[0] || null })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={submitJob} disabled={jobSaving}><Send className="ml-2 h-4 w-4" />{jobSaving ? 'جاري الإرسال...' : 'إرسال الطلب'}</Button></div>{jobResult && <div className="md:col-span-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-5"><p className="font-bold text-emerald-800">تم استلام الطلب رقم {jobResult.applicationNumber}</p><p className="mt-2 break-all text-sm">رمز المتابعة: <strong dir="ltr">{jobResult.trackingToken}</strong></p></div>}</CardContent></Card></TabsContent>

          <TabsContent value="track-job"><TrackCard title="متابعة طلب التوظيف" token={jobTrackToken} onToken={setJobTrackToken} onSearch={trackJob} result={jobTrackResult} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;

const TrackCard = ({ title, token, onToken, onSearch, result }: { title: string; token: string; onToken: (value: string) => void; onSearch: () => void; result: any }) => <Card className={shell}><CardHeader><CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />{title}</CardTitle><CardDescription>استخدم رمز المتابعة الخاص الذي ظهر بعد إرسال الطلب.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Input dir="ltr" value={token} onChange={(e) => onToken(e.target.value)} placeholder="رمز المتابعة" /><Button onClick={onSearch}><Search className="ml-2 h-4 w-4" />بحث</Button></div>{result && <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5"><p className="font-black text-slate-800">{result.ticketNumber || result.applicationNumber}</p>{result.site?.name && <p className="mt-1 text-sm">الموقع: {result.site.name}</p>}<p className="mt-2"><Badge variant="outline" className="border-sky-300 bg-white text-sky-700">{statusLabels[result.status] || result.status}</Badge></p>{result.resolutionNote && <p className="mt-3 text-sm">ملاحظة المعالجة: {result.resolutionNote}</p>}</div>}</CardContent></Card>;
