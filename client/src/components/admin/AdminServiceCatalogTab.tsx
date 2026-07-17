import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Layers, List, Wrench } from 'lucide-react';

interface Category { id: string; name: string; key: string; icon: string; description: string; isActive: boolean; sortOrder: number; itemCount?: number; }
interface ServiceItem { id: string; name: string; key: string; unit: string; description: string; isActive: boolean; categoryId: string; wtCount?: number; }
interface WorkType { id: string; name: string; key: string; estimatedDuration: number; defaultPrice: number; isActive: boolean; serviceItemId: string; }

type ViewLevel = 'categories' | 'items' | 'workTypes';

export default function AdminServiceCatalogTab() {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected context
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<ServiceItem | null>(null);

  // Create / Edit forms
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.admin.serviceCatalog.getCategories();
      setCategories(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (catId: string) => {
    setLoading(true);
    try {
      const data = await api.admin.serviceCatalog.getItems(catId);
      setItems(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWorkTypes = useCallback(async (itemId: string) => {
    setLoading(true);
    try {
      const data = await api.admin.serviceCatalog.getWorkTypes(itemId);
      setWorkTypes(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const drillIntoCategory = (cat: Category) => {
    setSelectedCat(cat);
    setSelectedItem(null);
    setViewLevel('items');
    loadItems(cat.id);
  };

  const drillIntoItem = (item: ServiceItem) => {
    setSelectedItem(item);
    setViewLevel('workTypes');
    loadWorkTypes(item.id);
  };

  const openCreate = () => {
    setEditTarget(null);
    if (viewLevel === 'categories') setFormData({ name: '', key: '', icon: '🔧', description: '' });
    else if (viewLevel === 'items') setFormData({ name: '', key: '', unit: 'unit', description: '' });
    else setFormData({ name: '', key: '', estimatedDuration: 60, defaultPrice: 0 });
    setShowForm(true);
  };

  const openEdit = (item: any) => {
    setEditTarget(item);
    setFormData({ ...item });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (viewLevel === 'categories') {
        if (editTarget) {
          const updated = await api.admin.serviceCatalog.updateCategory(editTarget.id, formData);
          setCategories(prev => prev.map(c => c.id === editTarget.id ? { ...c, ...updated } : c));
          toast({ title: '✅ Category updated' });
        } else {
          await api.admin.serviceCatalog.createCategory(formData);
          toast({ title: '✅ Category created' });
          loadCategories();
        }
      } else if (viewLevel === 'items') {
        if (editTarget) {
          const updated = await api.admin.serviceCatalog.updateItem(editTarget.id, formData);
          setItems(prev => prev.map(i => i.id === editTarget.id ? { ...i, ...updated } : i));
          toast({ title: '✅ Item updated' });
        } else {
          await api.admin.serviceCatalog.createItem({ ...formData, categoryId: selectedCat!.id });
          toast({ title: '✅ Item created' });
          loadItems(selectedCat!.id);
        }
      } else {
        if (editTarget) {
          const updated = await api.admin.serviceCatalog.updateWorkType(editTarget.id, formData);
          setWorkTypes(prev => prev.map(w => w.id === editTarget.id ? { ...w, ...updated } : w));
          toast({ title: '✅ Work type updated' });
        } else {
          await api.admin.serviceCatalog.createWorkType({ ...formData, serviceItemId: selectedItem!.id });
          toast({ title: '✅ Work type created' });
          loadWorkTypes(selectedItem!.id);
        }
      }
      setShowForm(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item: any) => {
    try {
      if (viewLevel === 'categories') {
        await api.admin.serviceCatalog.updateCategory(item.id, { isActive: !item.isActive });
        setCategories(prev => prev.map(c => c.id === item.id ? { ...c, isActive: !c.isActive } : c));
      } else if (viewLevel === 'items') {
        await api.admin.serviceCatalog.updateItem(item.id, { isActive: !item.isActive });
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
      } else {
        await api.admin.serviceCatalog.updateWorkType(item.id, { isActive: !item.isActive });
        setWorkTypes(prev => prev.map(w => w.id === item.id ? { ...w, isActive: !w.isActive } : w));
      }
    } catch (err: any) {
      toast({ title: 'Toggle failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry? This may also delete child records.')) return;
    try {
      if (viewLevel === 'categories') {
        await api.admin.serviceCatalog.deleteCategory(id);
        setCategories(prev => prev.filter(c => c.id !== id));
      } else if (viewLevel === 'items') {
        await api.admin.serviceCatalog.deleteItem(id);
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        await api.admin.serviceCatalog.deleteWorkType(id);
        setWorkTypes(prev => prev.filter(w => w.id !== id));
      }
      toast({ title: 'Deleted successfully' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    }
  };

  // Breadcrumb
  const breadcrumbs = [
    { label: 'Categories', level: 'categories' as ViewLevel },
    ...(selectedCat ? [{ label: `${selectedCat.icon} ${selectedCat.name}`, level: 'items' as ViewLevel }] : []),
    ...(selectedItem ? [{ label: selectedItem.name, level: 'workTypes' as ViewLevel }] : []),
  ];

  const currentItems = viewLevel === 'categories' ? categories : viewLevel === 'items' ? items : workTypes;
  const levelLabel = viewLevel === 'categories' ? 'Category' : viewLevel === 'items' ? 'Service Item' : 'Work Type';

  const formFields = viewLevel === 'categories'
    ? ['name', 'key', 'icon', 'description']
    : viewLevel === 'items'
    ? ['name', 'key', 'unit', 'description']
    : ['name', 'key', 'estimatedDuration', 'defaultPrice'];

  return (
    <div className="space-y-5">
      {/* Level nav + stats */}
      <div className="flex flex-wrap items-center gap-3">
        {[
          { level: 'categories' as ViewLevel, label: 'Categories', icon: <Layers className="w-4 h-4" />, count: categories.length },
          { level: 'items' as ViewLevel, label: 'Service Items', icon: <List className="w-4 h-4" />, count: items.length },
          { level: 'workTypes' as ViewLevel, label: 'Work Types', icon: <Wrench className="w-4 h-4" />, count: workTypes.length },
        ].map(lv => (
          <div key={lv.level} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${viewLevel === lv.level ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
            {lv.icon}
            {lv.label}
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">{lv.count}</span>
          </div>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((bc, i) => (
          <span key={bc.level} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <button
              type="button"
              onClick={() => {
                setViewLevel(bc.level);
                if (bc.level === 'categories') { setSelectedCat(null); setSelectedItem(null); }
                else if (bc.level === 'items' && selectedCat) { setSelectedItem(null); loadItems(selectedCat.id); }
              }}
              className={`hover:text-primary transition-colors ${i === breadcrumbs.length - 1 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
            >
              {bc.label}
            </button>
          </span>
        ))}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">
          {viewLevel === 'items' && selectedCat ? `Items in ${selectedCat.name}` :
           viewLevel === 'workTypes' && selectedItem ? `Work Types for ${selectedItem.name}` :
           'All Service Categories'}
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 gradient-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add {levelLabel}
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-slide-up">
          <h4 className="font-semibold text-foreground text-sm">{editTarget ? `Edit ${levelLabel}` : `New ${levelLabel}`}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formFields.map(field => (
              <div key={field}>
                <label className="text-xs font-medium text-muted-foreground block mb-1 capitalize">{field.replace(/([A-Z])/g, ' $1')}</label>
                {field === 'description' ? (
                  <textarea
                    value={formData[field] || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
                    rows={2}
                  />
                ) : (
                  <input
                    type={field === 'estimatedDuration' || field === 'defaultPrice' ? 'number' : 'text'}
                    min={0}
                    value={formData[field] || ''}
                    onChange={e => setFormData((p: any) => ({ ...p, [field]: field === 'estimatedDuration' || field === 'defaultPrice' ? Number(e.target.value) : e.target.value }))}
                    placeholder={field === 'key' ? 'snake_case_key' : field === 'icon' ? '🔧' : ''}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="gradient-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
              {saving && <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />}
              {editTarget ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="border border-border bg-background text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {currentItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-3xl block mb-2">📭</span>
              No {levelLabel.toLowerCase()}s yet. Click &quot;Add {levelLabel}&quot; to create one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs uppercase font-medium">
                  <th className="px-4 py-3 text-left">
                    {viewLevel === 'categories' ? 'Category' : viewLevel === 'items' ? 'Item' : 'Work Type'}
                  </th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">
                    {viewLevel === 'categories' ? 'Key' : viewLevel === 'items' ? 'Unit' : 'Duration / Default ₹'}
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    {viewLevel === 'categories' ? 'Items' : viewLevel === 'items' ? 'Work Types' : 'Description'}
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentItems.map((item: any) => (
                  <tr key={item.id} className={`hover:bg-muted/10 transition-colors ${!item.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {viewLevel === 'categories' && <span className="text-lg">{item.icon}</span>}
                        <div>
                          <div className="font-medium text-foreground">{item.name}</div>
                          {item.description && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{item.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs font-mono">
                      {viewLevel === 'categories' ? item.key :
                       viewLevel === 'items' ? item.unit :
                       `${item.estimatedDuration}min · ₹${item.defaultPrice}`}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {viewLevel === 'categories' ? (item.itemCount ?? '—') :
                       viewLevel === 'items' ? (item.wtCount ?? '—') :
                       item.key}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(item)} title={item.isActive ? 'Disable' : 'Enable'}>
                        {item.isActive
                          ? <ToggleRight className="w-5 h-5 text-success mx-auto" />
                          : <ToggleLeft className="w-5 h-5 text-muted-foreground mx-auto" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {viewLevel !== 'workTypes' && (
                          <button
                            onClick={() => viewLevel === 'categories' ? drillIntoCategory(item) : drillIntoItem(item)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors text-xs font-medium"
                            title={`View ${viewLevel === 'categories' ? 'items' : 'work types'}`}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
