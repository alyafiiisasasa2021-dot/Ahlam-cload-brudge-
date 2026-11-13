import React, { useState, useRef, useEffect } from 'react';
import { Trash2, RotateCcw, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

// واجهة لتمثيل الإعداد أو البند القابل للحذف
export interface SettingItem {
  id: string;
  title: string;
  description: string;
}

const DEFAULT_SETTINGS: SettingItem[] = [
  { id: '1', title: 'مؤقت الهدوء التلقائي', description: '30 ثانية لكسر الصمت' },
  { id: '2', title: 'الانتقاء الذكي للشات', description: 'تجاوز التكدس واختيار التعليق الأبرز' },
  { id: '3', title: 'مزامنة الفيديو والصوت', description: 'تأخير 80 مللي ثانية للشفاه' },
  { id: '4', title: 'التعليقات المكررة والعشوائية', description: 'فلترة وإزالة الرسائل غير المرغوب فيها من البث' },
  { id: '5', title: 'الذاكرة الصوتية المؤقتة (Cache)', description: 'مقاطع الصوت المخزنة مؤقتاً لتسريع النطق' },
];

interface SettingsPanelWithUndoProps {
  onSettingDeleted?: (item: SettingItem) => void;
  onSettingRestored?: (item: SettingItem) => void;
  onClearUnwantedChat?: () => void;
  onClearAudioCache?: () => void;
}

export function SettingsPanelWithUndo({
  onSettingDeleted,
  onSettingRestored,
  onClearUnwantedChat,
  onClearAudioCache,
}: SettingsPanelWithUndoProps = {}) {
  // القائمة الحالية للإعدادات والبنود
  const [settings, setSettings] = useState<SettingItem[]>(DEFAULT_SETTINGS);

  // سلة المحذوفات المؤقتة للاسترجاع أو الحذف النهائي
  const [trashBin, setTrashBin] = useState<SettingItem[]>([]);

  // رسالة التراجع المؤقتة (Toast)
  const [lastDeleted, setLastDeleted] = useState<SettingItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // دالة الحذف الآمن مع إمكانية التراجع
  const handleDelete = (item: SettingItem) => {
    setSettings((prev) => prev.filter((s) => s.id !== item.id));
    setTrashBin((prev) => [...prev.filter((s) => s.id !== item.id), item]);
    setLastDeleted(item);
    onSettingDeleted?.(item);

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }

    // إخفاء تنبيه التراجع بعد 5 ثوانٍ
    undoTimerRef.current = setTimeout(() => {
      setLastDeleted(null);
    }, 5000);
  };

  // دالة التراجع الفوري (Undo)
  const handleUndo = () => {
    if (lastDeleted) {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      setSettings((prev) => [...prev.filter((s) => s.id !== lastDeleted.id), lastDeleted]);
      setTrashBin((prev) => prev.filter((s) => s.id !== lastDeleted.id));
      onSettingRestored?.(lastDeleted);
      setLastDeleted(null);
    }
  };

  // دالة الاسترجاع من سلة المحذوفات بشكل دائم
  const handleRestoreFromTrash = (item: SettingItem) => {
    setTrashBin((prev) => prev.filter((s) => s.id !== item.id));
    setSettings((prev) => [...prev.filter((s) => s.id !== item.id), item]);
    if (lastDeleted?.id === item.id) {
      setLastDeleted(null);
    }
    onSettingRestored?.(item);
  };

  // دالة الحذف النهائي لعنصر من سلة المحذوفات
  const handlePermanentDelete = (item: SettingItem) => {
    setTrashBin((prev) => prev.filter((s) => s.id !== item.id));
    if (lastDeleted?.id === item.id) {
      setLastDeleted(null);
    }
    showFeedback(`تم حذف "${item.title}" نهائياً`);
  };

  // دالة إفراغ سلة المحذوفات بالكامل
  const handleEmptyTrash = () => {
    setTrashBin([]);
    setLastDeleted(null);
    showFeedback('تم إفراغ سلة المحذوفات نهائياً');
  };

  // دالة إضافة عنصر جديد للقائمة
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    const item: SettingItem = {
      id: `custom-${Date.now()}`,
      title: newItemTitle.trim(),
      description: newItemDesc.trim() || 'بند مخصص قابل للإدارة والحذف الآمن',
    };
    setSettings((prev) => [item, ...prev]);
    setNewItemTitle('');
    setNewItemDesc('');
  };

  return (
    <div
      dir="rtl"
      className="p-6 bg-[#0B0F17] text-white rounded-2xl max-w-xl w-full mx-auto shadow-2xl border border-[#10B981]/30 space-y-4"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#10B981] flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span>قائمة الضبط وإزالة العناصر غير المرغوب فيها</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            احذف أي بند أو رسالة أو تعليق غير مرغوب فيه فوراً مع ميزة التراجع الذكي خلال 5 ثوانٍ أو الاسترجاع من السلة
          </p>
        </div>
        {settings.length < DEFAULT_SETTINGS.length && (
          <button
            type="button"
            onClick={() => {
              setSettings(DEFAULT_SETTINGS);
              setTrashBin([]);
              setLastDeleted(null);
              showFeedback('تمت استعادة جميع البنود الافتراضية');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </button>
        )}
      </div>

      {/* أزرار التنظيف السريع للأشياء غير المرغوب فيها */}
      {(onClearUnwantedChat || onClearAudioCache) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {onClearUnwantedChat && (
            <button
              type="button"
              onClick={() => {
                onClearUnwantedChat();
                showFeedback('تم تنظيف المحادثة وإزالة الرسائل غير المرغوب فيها');
              }}
              className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>مسح رسائل الدردشة غير المرغوب فيها</span>
            </button>
          )}
          {onClearAudioCache && (
            <button
              type="button"
              onClick={() => {
                onClearAudioCache();
                showFeedback('تم تفريغ طابور الصوت والذاكرة المؤقتة بنجاح');
              }}
              className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>تفريغ الصوتيات العالقة غير المرغوب فيها</span>
            </button>
          )}
        </div>
      )}

      {actionFeedback && (
        <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* نموذج سريع لإضافة عنصر أو قاعدة للتحكم بها أو حذفها */}
      <form onSubmit={handleAddCustomItem} className="flex items-center gap-2">
        <input
          type="text"
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="أضف بنداً أو عنصراً للقائمة..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <input
          type="text"
          value={newItemDesc}
          onChange={(e) => setNewItemDesc(e.target.value)}
          placeholder="وصف مختصر (اختياري)..."
          className="hidden sm:block flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!newItemTitle.trim()}
          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة</span>
        </button>
      </form>

      {/* قائمة الإعدادات النشطة */}
      <div className="space-y-2.5">
        {settings.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#1B2A4A]/60 border border-gray-700 text-xs text-gray-400 text-center">
            تم نقل جميع البنود إلى سلة المحذوفات المؤقتة بالأسفل — يمكنك استرجاعها أو حذفها نهائياً.
          </div>
        ) : (
          settings.map((item) => (
            <div
              key={item.id}
              className="flex justify-between items-center bg-[#1B2A4A] p-3 rounded-xl border border-gray-700 hover:border-gray-600 transition-all"
            >
              <div>
                <h4 className="font-semibold text-sm text-white">{item.title}</h4>
                <p className="text-xs text-gray-400">{item.description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="حذف هذا العنصر غير المرغوب فيه"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* تنبيه التراجع الفوري (Undo Toast) */}
      {lastDeleted && (
        <div className="p-3 bg-emerald-600/95 text-white rounded-xl flex justify-between items-center text-xs shadow-lg animate-fade-in">
          <span className="font-bold">تم حذف "{lastDeleted.title}"</span>
          <button
            type="button"
            onClick={handleUndo}
            className="bg-white text-emerald-900 px-3 py-1 rounded-lg font-black hover:bg-gray-100 cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>تراجع (Undo)</span>
          </button>
        </div>
      )}

      {/* قسم سلة المحذوفات */}
      {trashBin.length > 0 && (
        <div className="border-t border-gray-700 pt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-gray-300">
              سلة المحذوفات المؤقتة ({trashBin.length})
            </h3>
            <button
              type="button"
              onClick={handleEmptyTrash}
              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>إفراغ السلة نهائياً</span>
            </button>
          </div>
          <div className="space-y-2">
            {trashBin.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-gray-900/90 p-2.5 rounded-xl border border-gray-800 text-xs"
              >
                <span className="text-gray-400 line-through">{item.title}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRestoreFromTrash(item)}
                    className="px-2 py-1 rounded bg-emerald-500/15 text-[#10B981] hover:bg-emerald-500/25 font-bold cursor-pointer transition"
                  >
                    استرجاع
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePermanentDelete(item)}
                    className="px-2 py-1 rounded bg-rose-500/15 text-rose-400 hover:bg-rose-500 hover:text-white font-bold cursor-pointer transition"
                    title="حذف نهائي"
                  >
                    حذف نهائي
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

