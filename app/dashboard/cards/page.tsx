'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CreditCard,
  Search,
  Trash2,
  X,
  Phone,
  Mail,
  Building2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Save,
  User,
  Briefcase,
  MapPin,
  Flag,
  SlidersHorizontal,
  List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardImage } from '@/components/card-image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BusinessCard {
  id: number;
  name: string;
  company?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  address?: string;
  country?: string;
  department_name?: string;
  website?: string;
  image_url?: string;
  image_display_url?: string;
  created_at: string;
  uploaded_by: string;
}

function roleSubtitle(role?: string) {
  if (role === 'admin') return 'All cards in your organization';
  if (role === 'manager') return 'Cards from your departments';
  return 'Cards you have scanned';
}

function cardImageSrc(card: Pick<BusinessCard, 'image_display_url' | 'image_url'>) {
  return card.image_display_url || card.image_url;
}

function websiteHref(website?: string) {
  if (!website) return '';
  return website.startsWith('http') ? website : `https://${website}`;
}

type CardsView = 'list' | 'cards';
const CARDS_VIEW_KEY = 'cards-view';

function ActionButton({
  href,
  icon: Icon,
  label,
  enabled,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  enabled: boolean;
}) {
  const inner = (
    <>
      <span
        className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
          enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
    </>
  );

  if (!enabled || !href) {
    return (
      <div className="flex flex-col items-center gap-1.5 opacity-60 pointer-events-none">
        {inner}
      </div>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
    >
      {inner}
    </a>
  );
}

function CardPreview({
  card,
  onClick,
}: {
  card: BusinessCard;
  onClick: () => void;
}) {
  const subtitle = [card.job_title, card.company].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-[22px] border border-slate-200/80 shadow-[0_8px_24px_rgba(15,23,42,0.06)] overflow-hidden active:scale-[0.99] transition-transform"
    >
      <div className="relative bg-zinc-900">
        <CardImage
          src={cardImageSrc(card)}
          alt={card.name}
          className="w-full h-auto max-h-[58vh] md:max-h-80 object-contain mx-auto block"
          fallbackClassName="w-full h-40 bg-zinc-800 flex items-center justify-center"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-16 px-4 pb-3.5">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-[16px] text-white truncate drop-shadow-sm">{card.name}</h3>
              <p className="text-[13px] text-white/80 truncate mt-0.5">
                {subtitle || 'No company'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-white/70 flex-shrink-0 mb-0.5" />
          </div>
          {(card.country || card.department_name) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {card.country && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white">
                  {card.country}
                </span>
              )}
              {card.department_name && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/15 text-white">
                  {card.department_name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function CardRow({
  card,
  onClick,
}: {
  card: BusinessCard;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-slate-200 shadow-sm p-3 flex items-center gap-3 active:bg-slate-50"
    >
      <div className="w-[4.75rem] h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
        <CardImage
          src={cardImageSrc(card)}
          alt={card.name}
          className="w-full h-full object-contain"
          fallbackClassName="w-full h-full bg-indigo-50 flex items-center justify-center"
        />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-900 truncate">{card.name}</h3>
        {card.company && <p className="text-sm text-slate-600 truncate">{card.company}</p>}
        {card.job_title && <p className="text-xs text-slate-500 truncate">{card.job_title}</p>}
        {(card.country || card.department_name) && (
          <p className="text-xs text-indigo-600 truncate mt-0.5">
            {[card.country, card.department_name].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-slate-300 flex-shrink-0" />
    </button>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: CardsView;
  onChange: (view: CardsView) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-slate-200/80 p-0.5" role="group" aria-label="Card list view">
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold ${
          value === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
        }`}
        aria-pressed={value === 'list'}
      >
        <List className="h-3.5 w-3.5" />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold ${
          value === 'cards' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
        }`}
        aria-pressed={value === 'cards'}
      >
        <CreditCard className="h-3.5 w-3.5" />
        Cards
      </button>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  href?: string;
}) {
  const body = (
    <div className="px-4 py-3.5 border-b border-slate-100 last:border-0 flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5 mb-1">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </label>
        {children}
      </div>
      {href && <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />}
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        className="block active:bg-slate-50"
      >
        {body}
      </a>
    );
  }

  return body;
}

export default function CardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<CardsView>('list');
  const [selectedCard, setSelectedCard] = useState<BusinessCard | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<BusinessCard>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchCards();
    }
  }, [status, router]);

  useEffect(() => {
    const saved = window.localStorage.getItem(CARDS_VIEW_KEY);
    if (saved === 'list' || saved === 'cards') {
      setViewMode(saved);
    }
  }, []);

  const handleViewChange = (view: CardsView) => {
    setViewMode(view);
    window.localStorage.setItem(CARDS_VIEW_KEY, view);
  };

  const fetchCards = async () => {
    try {
      const response = await fetch('/api/cards/list');
      const data = await response.json();
      if (data.cards) {
        setCards(data.cards);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (card: BusinessCard) => {
    setSelectedCard(card);
    setEditFormData(card);
    setIsDetailOpen(true);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!selectedCard) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/cards/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: selectedCard.id,
          cardData: {
            name: editFormData.name,
            company: editFormData.company,
            jobTitle: editFormData.job_title,
            email: editFormData.email,
            phone: editFormData.phone,
            address: editFormData.address,
            website: editFormData.website,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update card');
      }

      await fetchCards();
      setIsEditing(false);
      setSelectedCard((current) => (current ? { ...current, ...editFormData } : current));
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    if (!confirm('Delete this business card? This cannot be undone.')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cards/delete?id=${selectedCard.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete card');
      }

      setIsDetailOpen(false);
      setSelectedCard(null);
      await fetchCards();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete card');
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!session) return null;

  const filteredCards = cards.filter((card) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      card.name.toLowerCase().includes(searchLower) ||
      card.company?.toLowerCase().includes(searchLower) ||
      card.email?.toLowerCase().includes(searchLower) ||
      card.phone?.includes(searchTerm) ||
      card.address?.toLowerCase().includes(searchLower);

    const matchesCountry =
      !countryFilter ||
      (countryFilter === '__uncategorized__' ? !card.country : card.country === countryFilter);

    return matchesSearch && matchesCountry;
  });

  const availableCountries = Array.from(
    new Set(cards.map((card) => card.country).filter(Boolean) as string[])
  ).sort();

  const selectedWebsite = websiteHref(selectedCard?.website);

  return (
    <div className="md:p-6 lg:p-8 w-full">
      <div className="hidden md:block mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">Business Cards</h1>
        <p className="text-slate-500">{roleSubtitle((session.user as any)?.role)}</p>
      </div>

      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md px-4 pt-3 pb-2 md:static md:bg-transparent md:backdrop-blur-none md:px-0 md:pt-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              placeholder="Search name, company, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white border border-slate-200 text-[15px] shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            className={`h-11 w-11 rounded-full border flex items-center justify-center flex-shrink-0 ${
              countryFilter || showFilters
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
            aria-label="Filters"
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {(showFilters || countryFilter) && (
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="mt-2 w-full h-11 px-3 rounded-2xl bg-white border border-slate-200 text-sm"
          >
            <option value="">All countries / networks</option>
            <option value="__uncategorized__">Uncategorized</option>
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-3 md:mt-3">
          <p className="text-xs font-medium text-slate-400">
            {filteredCards.length} card{filteredCards.length === 1 ? '' : 's'}
            {countryFilter ? ' in this filter' : ''}
          </p>
          <ViewToggle value={viewMode} onChange={handleViewChange} />
        </div>
      </div>

      <div className="px-4 pb-6 md:px-0">
        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 px-6 py-16 text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <CreditCard className="h-7 w-7 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {searchTerm || countryFilter ? 'No cards found' : 'No cards yet'}
            </h3>
            <p className="text-sm text-slate-500">
              {searchTerm || countryFilter
                ? 'Try a different search or filter'
                : 'Scan a card to add it here'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 md:gap-3">
            {filteredCards.map((card) => (
              <CardRow key={card.id} card={card} onClick={() => handleCardClick(card)} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">
            {filteredCards.map((card) => (
              <CardPreview key={card.id} card={card} onClick={() => handleCardClick(card)} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent
          hideCloseButton
          className="max-w-2xl h-[100dvh] md:h-auto md:max-h-[90vh] overflow-hidden p-0 fixed inset-0 md:inset-auto md:left-[50%] md:top-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] rounded-none md:rounded-2xl w-full flex flex-col bg-[#f2f2f7] gap-0"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Card details</DialogTitle>
          </DialogHeader>

          {selectedCard && (
            <div className="flex flex-col flex-1 min-h-0">
              <div
                className="flex items-center justify-between px-2 h-12 bg-[#f2f2f7]/95 backdrop-blur-md flex-shrink-0"
                style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: '3rem' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      setIsEditing(false);
                      setEditFormData(selectedCard);
                    } else {
                      setIsDetailOpen(false);
                    }
                  }}
                  className="text-indigo-600 text-[16px] font-medium px-2 h-10 inline-flex items-center gap-0.5"
                >
                  <ChevronLeft className="h-5 w-5" />
                  {isEditing ? 'Cancel' : 'Cards'}
                </button>
                <p className="font-semibold text-slate-900 text-[16px]">
                  {isEditing ? 'Edit' : 'Contact'}
                </p>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-indigo-600 text-[16px] font-medium px-3 h-10 inline-flex items-center"
                  >
                    Edit
                  </button>
                ) : (
                  <span className="w-16" />
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => cardImageSrc(selectedCard) && setIsImageViewerOpen(true)}
                  className="w-full bg-zinc-900"
                >
                  <CardImage
                    src={cardImageSrc(selectedCard)}
                    alt={selectedCard.name}
                    className="w-full h-auto object-contain mx-auto"
                    fallbackClassName="w-full h-48 bg-zinc-800 flex items-center justify-center"
                  />
                </button>

                <div className="px-5 pt-5 pb-3 text-center">
                  {isEditing ? (
                    <input
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full text-center text-xl font-bold border border-slate-200 rounded-xl px-3 py-2 bg-white"
                    />
                  ) : (
                    <h2 className="text-[28px] font-bold text-slate-900 leading-tight tracking-tight">
                      {selectedCard.name}
                    </h2>
                  )}
                  {!isEditing && (
                    <p className="text-slate-500 mt-1 text-[15px]">
                      {[selectedCard.job_title, selectedCard.company].filter(Boolean).join(' · ') || '—'}
                    </p>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex justify-center gap-5 px-4 pb-5">
                    <ActionButton
                      href={selectedCard.phone ? `tel:${selectedCard.phone}` : undefined}
                      icon={Phone}
                      label="Call"
                      enabled={Boolean(selectedCard.phone)}
                    />
                    <ActionButton
                      href={selectedCard.email ? `mailto:${selectedCard.email}` : undefined}
                      icon={Mail}
                      label="Email"
                      enabled={Boolean(selectedCard.email)}
                    />
                    <ActionButton
                      href={
                        selectedCard.address
                          ? `https://maps.google.com/?q=${encodeURIComponent(selectedCard.address)}`
                          : undefined
                      }
                      icon={MapPin}
                      label="Map"
                      enabled={Boolean(selectedCard.address)}
                    />
                    <ActionButton
                      href={selectedWebsite || undefined}
                      icon={Globe}
                      label="Web"
                      enabled={Boolean(selectedWebsite)}
                    />
                  </div>
                )}

                <div className="mx-4 mb-4 bg-white rounded-[18px] overflow-hidden">
                  {isEditing && (
                    <>
                      <InfoRow icon={Building2} label="Company">
                        <input
                          value={editFormData.company || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                          className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2"
                        />
                      </InfoRow>
                      <InfoRow icon={Briefcase} label="Title">
                        <input
                          value={editFormData.job_title || ''}
                          onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                          className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2"
                        />
                      </InfoRow>
                    </>
                  )}
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    href={!isEditing && selectedCard.phone ? `tel:${selectedCard.phone}` : undefined}
                  >
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editFormData.phone || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2"
                      />
                    ) : (
                      <p className="text-[17px] text-slate-900">{selectedCard.phone || '—'}</p>
                    )}
                  </InfoRow>
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    href={!isEditing && selectedCard.email ? `mailto:${selectedCard.email}` : undefined}
                  >
                    {isEditing ? (
                      <input
                        type="email"
                        value={editFormData.email || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2"
                      />
                    ) : (
                      <p className="text-[17px] text-slate-900 break-all">
                        {selectedCard.email || '—'}
                      </p>
                    )}
                  </InfoRow>
                  <InfoRow
                    icon={MapPin}
                    label="Address"
                    href={
                      !isEditing && selectedCard.address
                        ? `https://maps.google.com/?q=${encodeURIComponent(selectedCard.address)}`
                        : undefined
                    }
                  >
                    {isEditing ? (
                      <textarea
                        value={editFormData.address || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        rows={2}
                        className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2 resize-none"
                      />
                    ) : (
                      <p className="text-[17px] text-slate-900 whitespace-pre-wrap">
                        {selectedCard.address || '—'}
                      </p>
                    )}
                  </InfoRow>
                  <InfoRow
                    icon={Globe}
                    label="Website"
                    href={!isEditing ? selectedWebsite || undefined : undefined}
                  >
                    {isEditing ? (
                      <input
                        value={editFormData.website || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                        className="w-full text-[15px] border border-slate-200 rounded-lg px-3 py-2"
                      />
                    ) : (
                      <p className="text-[17px] text-indigo-600 break-all">
                        {selectedCard.website || '—'}
                      </p>
                    )}
                  </InfoRow>
                  <InfoRow icon={Flag} label="Country / network">
                    <p className="text-[17px] text-slate-900">
                      {selectedCard.country || 'Uncategorized'}
                    </p>
                  </InfoRow>
                  {selectedCard.department_name && (
                    <InfoRow icon={Building2} label="Department">
                      <p className="text-[17px] text-slate-900">{selectedCard.department_name}</p>
                    </InfoRow>
                  )}
                  <InfoRow icon={User} label="Added by">
                    <p className="text-[17px] text-slate-900">
                      {selectedCard.uploaded_by} · {new Date(selectedCard.created_at).toLocaleDateString()}
                    </p>
                  </InfoRow>
                </div>

                <div className="px-4 pb-10 space-y-2">
                  {isEditing ? (
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-[16px]"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Saving...' : 'Save changes'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full h-12 rounded-2xl border-0 bg-white text-red-600 hover:bg-red-50 text-[16px]"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete card'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedCard && cardImageSrc(selectedCard) && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent
            hideCloseButton
            className="max-w-[100vw] max-h-[100dvh] h-[100dvh] p-0 bg-black border-none rounded-none"
          >
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImageViewerOpen(false)}
                className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-slate-900 rounded-full h-10 w-10"
              >
                <X className="h-5 w-5" />
              </Button>
              <CardImage
                src={cardImageSrc(selectedCard)}
                alt={selectedCard.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
