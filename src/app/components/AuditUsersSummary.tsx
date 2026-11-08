import React from 'react';
import { ArrowUpLeft, Clock3, Printer, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import type { AuditUserActivitySummary } from '../../types/audit';

type Props = {
  users: AuditUserActivitySummary[];
  loading: boolean;
  onSelectUser: (userId: string) => void;
  onCustomizeReport: (user: AuditUserActivitySummary) => void;
};

const formatTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('ar-SA-u-nu-latn', {
        timeZone: 'Asia/Riyadh',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true,
      })
    : '—';

export const AuditUsersSummary: React.FC<Props> = ({
  users, loading, onSelectUser, onCustomizeReport,
}) => (
  <Card>
    <CardHeader className="space-y-2">
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        الملف الرقابي للمستخدمين ({users.length})
      </CardTitle>
      <p className="text-sm text-muted-foreground">
        ملخص العمليات المسجلة لكل مستخدم وفق معايير التصفية الحالية. اختر مستخدمًا لعرض تسلسل عملياته بالتاريخ والوقت.
      </p>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>المستخدم</TableHead>
              <TableHead className="text-center">إجمالي العمليات</TableHead>
              <TableHead className="text-center">دخول</TableHead>
              <TableHead className="text-center">إضافات</TableHead>
              <TableHead className="text-center">تعديلات</TableHead>
              <TableHead className="text-center">حذف</TableHead>
              <TableHead className="text-center">رفع ملفات</TableHead>
              <TableHead className="text-center">عمليات فاشلة</TableHead>
              <TableHead>آخر نشاط موثق</TableHead>
              <TableHead className="text-center">التفاصيل والتقارير</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center">
                  جاري تجهيز الملفات الرقابية...
                </TableCell>
              </TableRow>
            ) : !users.length ? (
              <TableRow>
                <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                  لا توجد عمليات مطابقة للفلاتر المحددة.
                </TableCell>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell>
                  <p className="font-semibold">{user.username}</p>
                  <p dir="ltr" className="text-xs text-muted-foreground">{user.userEmail || '—'}</p>
                </TableCell>
                <TableCell className="text-center font-bold">{user.total}</TableCell>
                <TableCell className="text-center">{user.login}</TableCell>
                <TableCell className="text-center">{user.create}</TableCell>
                <TableCell className="text-center">{user.update}</TableCell>
                <TableCell className="text-center">{user.delete}</TableCell>
                <TableCell className="text-center">{user.upload}</TableCell>
                <TableCell className="text-center">
                  <span className={user.failed > 0 ? 'font-bold text-destructive' : ''}>
                    {user.failed}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatTime(user.lastActivityAt)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectUser(user.userId)}
                      title={`عرض السجل التفصيلي للمستخدم ${user.username}`}
                    >
                      <ArrowUpLeft className="ml-1 h-4 w-4" />
                      عرض السجل
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onCustomizeReport(user)}
                      title={`تخصيص وفرز وطباعة تقرير ${user.username}`}
                    >
                      <Printer className="ml-1 h-4 w-4" />
                      تقرير مفصل
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        الإحصاءات تخص النشاط المسجل فعليًا، ولا تمثل بالضرورة ساعات العمل أو مدة الجلسة. جميع الأوقات بتوقيت الرياض.
      </p>
    </CardContent>
  </Card>
);
