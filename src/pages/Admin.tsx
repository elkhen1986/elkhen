import { useEffect, useState, useMemo } from "react";
import { storage, db, auth } from "@/lib/firebase";
import { functions } from "@/main";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, listAll, deleteObject } from "firebase/storage";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, RefreshCw, Users, FileSpreadsheet, BarChart3, Shield, Download, Edit, Eye, ArrowRight, Save, X, UserPlus, Calendar, Clock, Activity, ArrowUpDown } from "lucide-react";
import { loadCategory, Question } from "@/lib/questionsLoader";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

const ADMIN_EMAILS = ["elkhen@elkhen.app"];

interface UserStats {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  totalPlayed: number;
  lastPlayed?: Date;
  createdAt?: Date;
  categories: Record<string, { used: number; total: number }>;
  gamesHistory?: any[];
  isActive?: boolean;
  subscriptionEnd?: Date;
  subscriptionStart?: Date;
  days?: number;
  devices?: any[];
}

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserStats[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [pointsFilter, setPointsFilter] = useState<"200" | "400" | "600" | "all">("all");
  const [totalQuestionsAll, setTotalQuestionsAll] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null);
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [subDays, setSubDays] = useState(30);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'createdAt', direction: 'desc' });
  const [alert, setAlert] = useState<{open: boolean, title: string, msg: string, type: 'success' | 'error'}>({ open: false, title: '', msg: '', type: 'success' });
  const [confirmDialog, setConfirmDialog] = useState<{open: boolean, title: string, msg: string, onConfirm: () => void}>({ open: false, title: '', msg: '', onConfirm: () => {} });

  const showAlert = (title: string, msg: string, type: 'success' | 'error' = 'success') => {
    setAlert({ open: true, title, msg, type });
  };

  const showConfirm = (title: string, msg: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, msg, onConfirm });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc'? 'asc' : 'desc'
    }));
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      setUser(u);
      setLoading(false);
      if (u?.email) localStorage.setItem("elkhen_user", u.email);
    });
    return () => unsub();
  }, []);

  const isAdmin = useMemo(() => user && ADMIN_EMAILS.includes(user.email || ""), [user]);

  const filteredUsers = useMemo(() => {
    let list = users.filter(u =>
      (u.email || '').toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.displayName || '').toLowerCase().includes(searchUser.toLowerCase())
    );
    const getTime = (d?: Date) => d instanceof Date? d.getTime() : 0;
    const getDaysLeft = (u: UserStats) => u.subscriptionEnd? Math.max(0, Math.ceil((u.subscriptionEnd.getTime() - Date.now()) / 86400000)) : -1;

    return [...list].sort((a, b) => {
      let aVal: any, bVal: any;
      switch(sortConfig.key) {
        case 'user':
          aVal = (a.displayName || a.email || '').toLowerCase();
          bVal = (b.displayName || b.email || '').toLowerCase();
          break;
        case 'totalPlayed':
          aVal = a.totalPlayed; bVal = b.totalPlayed; break;
        case 'createdAt':
          aVal = getTime(a.createdAt); bVal = getTime(b.createdAt); break;
        case 'lastPlayed':
          aVal = getTime(a.lastPlayed); bVal = getTime(b.lastPlayed); break;
        case 'isActive':
          aVal = a.isActive? 1 : 0; bVal = b.isActive? 1 : 0; break;
        case 'daysLeft':
          aVal = getDaysLeft(a); bVal = getDaysLeft(b); break;
        default:
          aVal = getTime(a.createdAt); bVal = getTime(b.createdAt);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc'? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc'? 1 : -1;
      return 0;
    });
  }, [users, searchUser, sortConfig]);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const list = await listAll(ref(storage, "questions"));
      const cats = list.items.map(i => i.name.replace(".xlsx", ""));
      setCategories(cats);
      if (cats[0]) setSelectedCat(cats[0]);
      let total = 0;
      for (const cat of cats) {
        const qs = await loadCategory(cat);
        total += qs.length;
      }
      setTotalQuestionsAll(total);
    })();
  }, [isAdmin]);

  const loadUsers = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    const stats: UserStats[] = [];
    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();
      const usedSnap = await getDocs(collection(db, "users", uid, "usedQuestions"));
      let totalPlayed = 0;
      const cats: Record<string, {used: number, total: number}> = {};
      for (const catDoc of usedSnap.docs) {
        const used = (catDoc.data().ids || []).length;
        totalPlayed += used;
        cats[catDoc.id] = { used, total: 0 };
      }
      stats.push({
        uid,
        email: userData.email || "unknown",
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        totalPlayed,
        lastPlayed: userData.lastPlayed?.toDate(),
        createdAt: userData.createdAt?.toDate(),
        categories: cats,
        gamesHistory: userData.gamesHistory || [],
        isActive: userData.isActive,
        subscriptionEnd: userData.subscriptionEnd?.toDate(),
        subscriptionStart: userData.subscriptionStart?.toDate(),
        days: userData.days,
        devices: userData.devices || []
      });
    }
    setUsers(stats.sort((a,b) => b.totalPlayed - a.totalPlayed));
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadUsers();
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedCat) return;
    loadCategory(selectedCat).then(setQuestions);
  }, [selectedCat]);

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".xlsx")) {
      showAlert('خطأ', 'لازم ملف Excel', 'error');
      return;
    }
    setUploading(true);
    try {
      const catName = file.name.replace(".xlsx", "");
      await uploadBytes(ref(storage, `questions/${file.name}`), file);
      showAlert('تم بنجاح', `تم رفع ${catName}`, 'success');
      setCategories(prev => [...new Set([...prev, catName])]);
      setSelectedCat(catName);
      const qs = await loadCategory(catName);
      setTotalQuestionsAll(prev => prev + qs.length);
    } catch (e) {
      showAlert('خطأ', 'فشل الرفع', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCategory = async (cat: string) => {
    showConfirm('حذف فئة', `هل أنت متأكد من حذف "${cat}" نهائياً؟`, async () => {
      await deleteObject(ref(storage, `questions/${cat}.xlsx`));
      showAlert('تم', 'تم حذف الفئة', 'success');
      setCategories(prev => prev.filter(c => c!== cat));
    });
  };

  const handleResetUser = async (uid: string, cat?: string) => {
  const msg = cat
   ? `متأكد عايز تصفر فئة "${cat}" ؟\nالعملية دي مش هترجع`
    : `متأكد عايز تصفر كل الفئات للمستخدم ده ؟`;

  showConfirm('تأكيد التصفير', msg, async () => {
    if (cat) {
      await deleteDoc(doc(db, "users", uid, "usedQuestions", cat));
      showAlert('تم', `تم تصفير ${cat}`, 'success');
    } else {
      const snap = await getDocs(collection(db, "users", uid, "usedQuestions"));
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
      showAlert('تم', 'تم تصفير كل الفئات', 'success');
    }
    await loadUsers();
  });
};

  const handleDeleteUser = async (uid: string) => {
    showConfirm('حذف حساب', 'تحذف الحساب نهائيا من قاعدة البيانات؟', async () => {
      await deleteDoc(doc(db, "users", uid));
      showAlert('تم', 'تم حذف الحساب', 'success');
      setUsers(prev => prev.filter(u => u.uid!== uid));
      setSelectedUser(null);
    });
  };

  const handleCreateUser = async () => {
    if (!newUserEmail ||!newUserPassword) {
      showAlert('خطأ', 'اكتب اسم المستخدم والباسورد', 'error');
      return;
    }
    try {
      const username = newUserEmail.replace("@elkhen.app", "").trim().toLowerCase();
      const createUser = httpsCallable(functions, "adminCreateUser");
      await createUser({ username, password: newUserPassword });
      showAlert('تم', `تم إنشاء ${username}@elkhen.app`, 'success');
      setShowNewUserDialog(false);
      setNewUserEmail("");
      setNewUserPassword("");
      await loadUsers();
    } catch (e: any) {
      if (e.code === 'already-exists') showAlert('خطأ', 'الاسم موجود', 'error');
      else if (e.code === 'permission-denied') showAlert('خطأ', 'لازم تكون أدمن', 'error');
      else showAlert('خطأ', e.message || "فشل الإنشاء", 'error');
    }
  };

  const adminSetSubscription = httpsCallable(functions, "adminSetSubscription");

  const handleActivateSubscription = async () => {
    if (!selectedUser) return;
    try {
      await adminSetSubscription({ uid: selectedUser.uid, days: subDays });
      showAlert('تم', `تم تفعيل الاشتراك لمدة ${subDays} يوم`, 'success');
      await loadUsers();
      const updated = users.find(u => u.uid === selectedUser.uid);
      if (updated) setSelectedUser(updated);
    } catch (e: any) {
      showAlert('خطأ', e.message || "فشل تفعيل الاشتراك", 'error');
    }
  };

  const exportQuestions = () => {
    const ws = XLSX.utils.json_to_sheet(questions.map(q => ({
      النقاط: q.points,
      السؤال: q.question,
      الجواب: q.answer,
      الصورة: q.image?.join(",") || "",
      صورة_الجواب: q.answerImage?.join(",") || ""
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, selectedCat);
    XLSX.writeFile(wb, `${selectedCat}-export.xlsx`);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion ||!selectedCat) return;
    try {
      const updatedQuestions = questions.map(q =>
        q.id === editingQuestion.id? editingQuestion : q
      );
      setQuestions(updatedQuestions);
      const grouped = {200: [], 400: [], 600: []} as Record<number, any[]>;
      updatedQuestions.forEach(q => {
        if (grouped[q.points]) {
          grouped[q.points].push({
            question: q.question,
            answer: q.answer,
            image: q.image?.join(",") || "",
            answerImage: q.answerImage?.join(",") || ""
          });
        }
      });
      const wb = XLSX.utils.book_new();
      [200, 400, 600].forEach(points => {
        if (grouped[points].length > 0) {
          const ws = XLSX.utils.json_to_sheet(grouped[points]);
          XLSX.utils.book_append_sheet(wb, ws, String(points));
        }
      });
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const file = new Blob([wbout], { type: 'application/octet-stream' });
      await uploadBytes(ref(storage, `questions/${selectedCat}.xlsx`), file);
      localStorage.removeItem(`elkhen-cache-${selectedCat}`);
      if ('caches' in window) { try { await caches.delete('elkhen-questions-v1'); } catch {} }
      showAlert('تم', 'تم حفظ التعديل', 'success');
      setEditingQuestion(null);
      setTimeout(() => loadCategory(selectedCat).then(setQuestions), 500);
    } catch (e) {
      showAlert('خطأ', 'فشل الحفظ', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Shield className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">غير مصرح</h1>
        <p className="text-muted-foreground">سجل دخول بإيميل الأدمن</p>
        <p className="text-sm">{user?.email}</p>
      </div>
    );
  }

  const filteredQuestions = pointsFilter === "all"
  ? questions
    : questions.filter(q => q.points === parseInt(pointsFilter));

  const countsByPoints = {
    200: questions.filter(q => q.points === 200).length,
    400: questions.filter(q => q.points === 400).length,
    600: questions.filter(q => q.points === 600).length,
  };

  const SortIcon = ({ column }: { column: string }) =>
    sortConfig.key === column? <span className="ml-1">{sortConfig.direction === 'asc'? '↑' : '↓'}</span> : <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                لوحة تحكم الخن
              </h1>
              <p className="text-muted-foreground mt-1">إدارة كاملة للأسئلة والمستخدمين</p>
            </div>
          </div>
          <Badge variant="outline" className="text-sm">
            {users.length} مستخدم
          </Badge>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-">
            <TabsTrigger value="questions" className="gap-2"><FileSpreadsheet className="w-4 h-4" />الأسئلة</TabsTrigger>
            <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />المستخدمين</TabsTrigger>
            <TabsTrigger value="stats" className="gap-2"><BarChart3 className="w-4 h-4" />الإحصائيات</TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="text-lg">الفئات ({categories.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary cursor-pointer transition-colors"
                       onClick={() => document.getElementById('file-upload')?.click()}>
                    <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm">ارفع Excel</p>
                    <input id="file-upload" type="file" accept=".xlsx" className="hidden"
                           onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                  </div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {categories.map(cat => (
                      <div key={cat} className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-accent ${selectedCat === cat? 'bg-accent' : ''}`}
                           onClick={() => setSelectedCat(cat)}>
                        <span className="text-sm truncate">{cat}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => {e.stopPropagation(); handleDeleteCategory(cat)}}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{selectedCat} ({questions.length} سؤال)</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportQuestions}><Download className="w-4 h-4 ml-1" />تصدير</Button>
                    <Button variant="outline" size="sm" onClick={() => loadCategory(selectedCat).then(setQuestions)}><RefreshCw className="w-4 h-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs value={pointsFilter} onValueChange={(v) => setPointsFilter(v as any)} className="mb-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all">الكل ({questions.length})</TabsTrigger>
                      <TabsTrigger value="200">200 ({countsByPoints[200]})</TabsTrigger>
                      <TabsTrigger value="400">400 ({countsByPoints[400]})</TabsTrigger>
                      <TabsTrigger value="600">600 ({countsByPoints[600]})</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="border rounded-lg max-h- overflow-y-auto">
                    <Table className="w-full table-fixed">
                      <colgroup>
                        <col className="w-16" />
                        <col className="w-24" />
                        <col />
                        <col />
                        <col className="w-20" />
                        <col className="w-20" />
                        <col className="w-24" />
                      </colgroup>
                      <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                          <TableHead>نقاط</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>السؤال</TableHead>
                          <TableHead>الجواب</TableHead>
                          <TableHead>صورة</TableHead>
                          <TableHead>صورة جواب</TableHead>
                          <TableHead>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuestions.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell><Badge variant="secondary">{q.points}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{q.id?.replace(`${selectedCat}-`, '') || q.id}</TableCell>
                            <TableCell className="break-words whitespace-normal align-top" title={q.question}>{q.question}</TableCell>
                            <TableCell className="break-words whitespace-normal align-top text-muted-foreground" title={q.answer}>{q.answer}</TableCell>
                            <TableCell>{q.image?.[0]? <img src={q.image[0]} className="w-10 h-10 object-cover rounded border" alt="" /> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                            <TableCell>{q.answerImage?.[0]? <img src={q.answerImage[0]} className="w-10 h-10 object-cover rounded border" alt="" /> : <span className="text-xs text-muted-foreground">-</span>}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingQuestion(q)}><Edit className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3 h-3" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>إدارة المستخدمين ({filteredUsers.length})</CardTitle>
                  <div className="flex gap-2">
                    <Input placeholder="بحث بالإيميل..." className="w-64" value={searchUser} onChange={e => setSearchUser(e.target.value)} />
                    <Button onClick={() => setShowNewUserDialog(true)} className="gap-2"><UserPlus className="w-4 h-4" />حساب جديد</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-auto max-h-">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('user')}>
                          <div className="flex items-center">المستخدم <SortIcon column="user" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('totalPlayed')}>
                          <div className="flex items-center">إجمالي اللعب <SortIcon column="totalPlayed" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('createdAt')}>
                          <div className="flex items-center">تاريخ الإنشاء <SortIcon column="createdAt" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('lastPlayed')}>
                          <div className="flex items-center">آخر نشاط <SortIcon column="lastPlayed" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('isActive')}>
                          <div className="flex items-center">الاشتراك <SortIcon column="isActive" /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-accent/50" onClick={() => handleSort('daysLeft')}>
                          <div className="flex items-center">متبقي <SortIcon column="daysLeft" /></div>
                        </TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => {
                        const daysLeft = u.subscriptionEnd? Math.max(0, Math.ceil((u.subscriptionEnd.getTime() - Date.now()) / 86400000)) : 0;
                        const isRecent = u.lastPlayed && (Date.now() - u.lastPlayed.getTime() < 3*86400000);
                        return (
                          <TableRow key={u.uid} className="cursor-pointer hover:bg-accent/50" onClick={() => { setSelectedUser(u); setSubDays(30); }}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${u.email}`} className="w-8 h-8 rounded-full" />
                                <div>
                                  <p className="font-medium text-sm">{u.displayName || u.email.split('@')[0]}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell><Badge>{u.totalPlayed} سؤال</Badge></TableCell>
                            <TableCell className="text-xs">{u.createdAt?.toLocaleDateString('ar-EG') || '-'}</TableCell>
                            <TableCell className={`text-xs ${isRecent? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>{u.lastPlayed?.toLocaleDateString('ar-EG') || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={u.isActive? "default" : "destructive"} className={u.isActive? "bg-green-600" : ""}>
                                {u.isActive? 'فعال' : 'منتهي'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-xs font-mono ${daysLeft < 7? 'text-red-500' : daysLeft < 30? 'text-amber-500' : 'text-green-600'}`}>
                              {u.isActive? `${daysLeft} يوم` : '-'}
                            </TableCell>
                            <TableCell onClick={e => e.stopPropagation()}>
                              <Button variant="outline" size="sm" onClick={() => handleResetUser(u.uid)} className="hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors">تصفير</Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">إجمالي الأسئلة</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalQuestionsAll}</div><p className="text-xs text-muted-foreground mt-1">عبر {categories.length} فئة</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">إجمالي اللعب</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{users.reduce((s,u) => s + u.totalPlayed, 0)}</div><p className="text-xs text-muted-foreground mt-1">سؤال تم لعبه</p></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">المستخدمين النشطين</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{users.filter(u => u.totalPlayed > 0).length}</div><p className="text-xs text-muted-foreground mt-1">من أصل {users.length}</p></CardContent></Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingQuestion} onOpenChange={() => setEditingQuestion(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>تعديل السؤال</DialogTitle></DialogHeader>
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-4 gap-4">
                <div><Label>النقاط</Label><select value={editingQuestion.points} onChange={e => setEditingQuestion({...editingQuestion, points: parseInt(e.target.value)})} className="w-full mt-1 p-2 border rounded bg-background"><option value={200}>200</option><option value={400}>400</option><option value={600}>600</option></select></div>
                <div className="col-span-3"><Label>ID</Label><Input value={editingQuestion.id} disabled className="mt-1 font-mono text-xs" /></div>
              </div>
              <div><Label>السؤال</Label><Textarea value={editingQuestion.question} onChange={e => setEditingQuestion({...editingQuestion, question: e.target.value})} className="mt-1 min-h-24" dir="rtl" /></div>
              <div><Label>الجواب</Label><Textarea value={editingQuestion.answer} onChange={e => setEditingQuestion({...editingQuestion, answer: e.target.value})} className="mt-1" dir="rtl" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>رابط الصورة</Label><Input value={editingQuestion.image?.[0] || ""} onChange={e => setEditingQuestion({...editingQuestion, image: e.target.value? [e.target.value] : undefined})} placeholder="https://..." className="mt-1" dir="ltr" /></div>
                <div><Label>رابط صورة الجواب</Label><Input value={editingQuestion.answerImage?.[0] || ""} onChange={e => setEditingQuestion({...editingQuestion, answerImage: e.target.value? [e.target.value] : undefined})} placeholder="https://..." className="mt-1" dir="ltr" /></div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2"><Button variant="outline" onClick={() => setEditingQuestion(null)}><X className="w-4 h-4 ml-1" />إلغاء</Button><Button onClick={handleSaveQuestion}><Save className="w-4 h-4 ml-1" />حفظ التعديل</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedUser && (
  <div onClick={() => setSelectedUser(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}>
    <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', width: '100%', maxWidth: '820px', height: '95vh', maxHeight: '95vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid hsl(var(--border))', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid hsl(var(--border))', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>تفاصيل الحساب</h2>
        <button onClick={() => setSelectedUser(null)} style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>
      <div style={{ flex: '1 1 0%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, border: '1px solid hsl(var(--border))', borderRadius: 12 }}>
            <img src={selectedUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedUser.email}`} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid hsl(var(--border))' }} />
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{selectedUser.displayName || selectedUser.email.split('@')[0]}</h3>
              <p style={{ margin: '4px 0', opacity: 0.7, fontSize: 14 }}>{selectedUser.email}</p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, opacity: 0.6 }}>UID: {selectedUser.uid}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 16, background: 'hsl(var(--card))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, fontSize: 13, marginBottom: 8 }}><Calendar className="w-4 h-4" /><span>تاريخ الإنشاء</span></div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedUser.createdAt?.toLocaleDateString('ar-EG') || '-'}</p>
            </div>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 16, background: 'hsl(var(--card))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, fontSize: 13, marginBottom: 8 }}><Clock className="w-4 h-4" /><span>آخر نشاط</span></div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedUser.lastPlayed?.toLocaleDateString('ar-EG') || '-'}</p>
            </div>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 16, background: 'hsl(var(--card))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7, fontSize: 13, marginBottom: 8 }}><Activity className="w-4 h-4" /><span>إجمالي اللعب</span></div>
              <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedUser.totalPlayed}</p>
            </div>
          </div>
          <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, padding: 16, background: 'hsl(var(--card))', marginBottom: 24 }}>
            <h4 style={{ fontWeight: 700, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}><Calendar className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} /> إدارة الاشتراك</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16, textAlign: 'center' }}>
              <div><p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>الحالة</p><p style={{ fontWeight: 700, margin: '6px 0 0 0', color: selectedUser.isActive? '#22c55e' : '#ef4444', fontSize: 15 }}>{selectedUser.isActive? 'فعال ✓' : 'منتهي ✗'}</p></div>
              <div><p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>ينتهي في</p><p style={{ fontWeight: 600, margin: '6px 0 0 0', fontSize: 14 }}>{selectedUser.subscriptionEnd?.toLocaleDateString('ar-EG') || '-'}</p></div>
              <div><p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>متبقي</p><p style={{ fontWeight: 700, margin: '6px 0 0 0', color: '#22c55e', fontSize: 15 }}>{selectedUser.subscriptionEnd? Math.max(0, Math.ceil((selectedUser.subscriptionEnd.getTime() - Date.now()) / 86400000)) : 0} يوم</p></div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Input type="number" min="1" max="3650" value={subDays} onChange={e => setSubDays(parseInt(e.target.value) || 30)} style={{ width: 90, height: 40, background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Button onClick={handleActivateSubscription} style={{ flex: 1, height: 40, background: '#22c55e', color: 'black', fontWeight: 600 }}>تفعيل اشتراك</Button>
            </div>
          </div>
          <div>
            <h4 style={{ fontWeight: 700, margin: '0 0 12px 0' }}>استهلاك الفئات</h4>
            <div style={{ border: '1px solid hsl(var(--border))', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'hsl(var(--background))', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, opacity: 0.7 }}>الفئة</th>
                      <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: 13, opacity: 0.7 }}>المستخدم</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: 13, opacity: 0.7, width: 100 }}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(selectedUser.categories).map(([cat, data]) => (
                      <tr key={cat} style={{ borderBottom: '1px solid hsl(var(--border) / 0.5)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 500 }}>{cat}</td>
                        <td style={{ padding: '12px 16px' }}><span style={{ border: '1px solid hsl(var(--border))', borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>{data.used} سؤال</span></td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <Button variant="ghost" size="sm" onClick={() => handleResetUser(selectedUser.uid, cat)} className="h-7 text-xs hover:bg-amber-500 hover:text-white transition-colors"><RefreshCw className="w-3 h-3 ml-1" /> تصفير</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: 16, borderTop: '1px solid hsl(var(--border))', display: 'flex', gap: 12, flexShrink: 0 }}>
        <Button variant="outline" onClick={() => handleResetUser(selectedUser.uid)} style={{ flex: 1, height: 44 }} className="hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors">تصفير العدادات</Button>
        <Button variant="destructive" onClick={() => handleDeleteUser(selectedUser.uid)} style={{ flex: 1, height: 44 }}><Trash2 className="w-4 h-4 ml-1" /> حذف الحساب نهائيا</Button>
      </div>
    </div>
  </div>
)}

      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إنشاء حساب جديد</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>اسم المستخدم</Label><Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="ahmed" className="mt-1" dir="ltr" /></div>
            <div><Label>كلمة المرور</Label><Input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="••••••••" className="mt-1" dir="ltr" /></div>
            <p className="text-xs text-muted-foreground">سيتم إنشاء الحساب تلقائياً</p>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowNewUserDialog(false)}>إلغاء</Button><Button onClick={handleCreateUser}>إنشاء</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {alert.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setAlert({...alert, open: false})}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'hsl(var(--background))', borderRadius: 16, width: '100%', maxWidth: 380, border: '1px solid hsl(var(--border))', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '28px 24px 20px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: alert.type === 'success'? '#16a34a15' : '#dc262615', border: `2px solid ${alert.type === 'success'? '#16a34a' : '#dc2626'}` }}>
                {alert.type === 'success'?
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> :
                  <svg width="32" height="32" viewBox="0 0 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                }
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{alert.title}</h3>
              <p style={{ margin: 0, opacity: 0.8, fontSize: 14, lineHeight: 1.5 }}>{alert.msg}</p>
            </div>
            <div style={{ padding: 16, borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => setAlert({...alert, open: false})} style={{ width: '100%', height: 44, borderRadius: 10, border: 'none', background: alert.type === 'success'? '#16a34a' : '#dc2626', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 15 }}>تمام</button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setConfirmDialog({...confirmDialog, open: false})}>
          <div onClick={e => e.stopPropagation()} dir="rtl" style={{ background: 'hsl(var(--background))', borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid hsl(var(--border))', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', margin: '0 auto 16px', display: 'grid', placeItems: 'center', background: '#f59e0b15', border: '2px solid #f59e0b' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"><path d="M12 9v4M12 17h.01M21 12a9 9 0 11-18 0 9 0 0118 0z"/></svg>
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>{confirmDialog.title}</h3>
              <p style={{ margin: 0, opacity: 0.8, fontSize: 14, whiteSpace: 'pre-line' }}>{confirmDialog.msg}</p>
            </div>
            <div style={{ padding: 16, display: 'flex', gap: 8, borderTop: '1px solid hsl(var(--border))' }}>
              <button onClick={() => setConfirmDialog({...confirmDialog, open: false})} style={{ flex: 1, height: 44, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'transparent', cursor: 'pointer', fontWeight: 600 }}>إلغاء</button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog({...confirmDialog, open: false}); }} style={{ flex: 1, height: 44, borderRadius: 10, border: 'none', background: '#f59e0b', color: 'black', fontWeight: 700, cursor: 'pointer' }}>تأكيد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}