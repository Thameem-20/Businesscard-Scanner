'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Search, Edit, Trash2, X, Phone, Mail, Building2, Globe, ChevronRight, Save, User, Briefcase, MapPin, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardImage } from '@/components/card-image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  website?: string;
  image_url?: string;
  image_display_url?: string;
  created_at: string;
  uploaded_by: string;
}

export default function CardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
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

  const handleEdit = () => {
    setIsEditing(true);
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
      // Update selected card with new data
      const updatedCard = cards.find(c => c.id === selectedCard.id);
      if (updatedCard) {
        setSelectedCard({ ...updatedCard, ...editFormData });
      }
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    
    if (!confirm('Are you sure you want to delete this business card? This action cannot be undone.')) {
      return;
    }

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full w-full">
      <div className="h-full w-full">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Business Cards</h1>
          <p className="text-gray-600">View and manage all business cards in your organization</p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cards by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          >
            <option value="">All countries</option>
            <option value="__uncategorized__">Uncategorized</option>
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || countryFilter ? 'No cards found' : 'No business cards yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || countryFilter
                ? 'Try adjusting your search or country filter'
                : 'No business cards found in your organization'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: Compact List View */}
            <div className="md:hidden space-y-3">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-4 active:bg-gray-50 cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <CardImage
                      src={card.image_display_url || card.image_url}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      fallbackClassName="w-full h-full bg-indigo-100 flex items-center justify-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                    {card.company && (
                      <p className="text-sm text-gray-600 truncate">{card.company}</p>
                    )}
                    {card.job_title && (
                      <p className="text-xs text-gray-500 truncate">{card.job_title}</p>
                    )}
                    {card.country && (
                      <p className="text-xs text-indigo-600 truncate">{card.country}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>

            {/* Desktop: 3 Cards per Row */}
            <div className="hidden md:grid md:grid-cols-3 gap-4 max-w-7xl mx-auto">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <CardImage
                      src={card.image_display_url || card.image_url}
                      alt={card.name}
                      className="w-full h-full object-cover"
                      fallbackClassName="w-full h-full bg-indigo-100 flex items-center justify-center"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                    {card.company && (
                      <p className="text-sm text-gray-600 truncate">{card.company}</p>
                    )}
                    {card.job_title && (
                      <p className="text-xs text-gray-500 truncate">{card.job_title}</p>
                    )}
                    {card.country && (
                      <p className="text-xs text-indigo-600 truncate">{card.country}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl h-[100dvh] md:h-auto md:max-h-[90vh] overflow-hidden p-3 md:p-5 fixed top-0 left-0 md:left-[50%] md:top-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] rounded-none md:rounded-xl w-full flex flex-col">
          <DialogHeader className="pr-8 md:pr-0 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="text-base font-semibold">Card Details</DialogTitle>
              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEdit}
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsEditing(false);
                      setEditFormData(selectedCard || {});
                    }}
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedCard && (
            <div className="flex flex-col flex-1 min-h-0 gap-2">
              {/* Card Image */}
              {selectedCard.image_url && (
                <div 
                  className="w-full h-56 md:h-60 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-95 transition-opacity border border-gray-200 flex-shrink-0"
                  onClick={() => setIsImageViewerOpen(true)}
                >
                  <CardImage
                    src={selectedCard.image_display_url || selectedCard.image_url}
                    alt={selectedCard.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Contact Info - Single Column */}
              <div className="space-y-2 flex-1 overflow-y-auto">
                {/* Name */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <User className="h-3 w-3" />
                    Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 truncate">{selectedCard.name || 'N/A'}</p>
                  )}
                </div>

                {/* Company */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Building2 className="h-3 w-3" />
                    Company
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.company || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 truncate">{selectedCard.company || 'N/A'}</p>
                  )}
                </div>

                {/* Job Title */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Briefcase className="h-3 w-3" />
                    Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.job_title || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 truncate">{selectedCard.job_title || 'N/A'}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Phone className="h-3 w-3" />
                    Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : selectedCard.phone ? (
                    <a href={`tel:${selectedCard.phone}`} className="text-sm no-underline flex items-center justify-between" style={{ color: '#111827' }}>
                      <span className="truncate">{selectedCard.phone}</span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900">N/A</p>
                  )}
                </div>

                {/* Email */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : selectedCard.email ? (
                    <a href={`mailto:${selectedCard.email}`} className="text-sm no-underline flex items-center justify-between" style={{ color: '#111827' }}>
                      <span className="truncate">{selectedCard.email}</span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900">N/A</p>
                  )}
                </div>

                {/* Address */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <MapPin className="h-3 w-3" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editFormData.address || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      rows={2}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white resize-none"
                    />
                  ) : selectedCard.address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(selectedCard.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm no-underline flex items-start justify-between gap-2"
                      style={{ color: '#111827' }}
                    >
                      <span className="whitespace-pre-wrap">{selectedCard.address}</span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 mt-0.5" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900">N/A</p>
                  )}
                </div>

                {/* Country */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Flag className="h-3 w-3" />
                    Country
                  </label>
                  <p className="text-sm text-gray-900">{selectedCard.country || 'Uncategorized'}</p>
                </div>

                {/* Website */}
                <div className="bg-gray-50 rounded-lg p-2.5">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                    <Globe className="h-3 w-3" />
                    Website
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    />
                  ) : selectedCard.website ? (
                    <a 
                      href={selectedCard.website.startsWith('http') ? selectedCard.website : `https://${selectedCard.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm no-underline flex items-center justify-between"
                      style={{ color: '#111827' }}
                    >
                      <span className="truncate">{selectedCard.website}</span>
                      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    </a>
                  ) : (
                    <p className="text-sm text-gray-900">N/A</p>
                  )}
                </div>
              </div>

              {/* Footer - pushed to bottom */}
              <div className="mt-auto flex-shrink-0 space-y-2" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Save Button (Edit Mode) */}
                {isEditing && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}

                {/* Footer Info */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 px-1">
                  <span>Added by {selectedCard.uploaded_by}</span>
                  <span>{new Date(selectedCard.created_at).toLocaleDateString()}</span>
                </div>

                {/* Delete Button */}
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full h-10 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Card'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Image Viewer Modal */}
      {selectedCard?.image_url && (
        <Dialog open={isImageViewerOpen} onOpenChange={setIsImageViewerOpen}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
            <div className="relative w-full h-[95vh] flex items-center justify-center p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsImageViewerOpen(false)}
                className="absolute top-4 right-4 z-50 bg-white/90 hover:bg-white text-gray-900 rounded-full h-10 w-10 md:h-12 md:w-12"
              >
                <X className="h-5 w-5 md:h-6 md:w-6" />
                <span className="sr-only">Close</span>
              </Button>
              <CardImage
                src={selectedCard.image_display_url || selectedCard.image_url}
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
