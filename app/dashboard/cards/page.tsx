'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, Search, Edit, Trash2, X, Phone, Mail, Building2, MapPin, Globe, ChevronRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  website?: string;
  image_url?: string;
  created_at: string;
  uploaded_by: string;
}

export default function CardsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cards, setCards] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
    return (
      card.name.toLowerCase().includes(searchLower) ||
      card.company?.toLowerCase().includes(searchLower) ||
      card.email?.toLowerCase().includes(searchLower) ||
      card.phone?.includes(searchTerm)
    );
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 h-full w-full">
      <div className="h-full w-full">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Business Cards</h1>
          <p className="text-gray-600">View and manage all business cards in your organization</p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search cards by name, company, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {filteredCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No cards found' : 'No business cards yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm
                ? 'Try adjusting your search terms'
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
                  {card.image_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-8 w-8 text-indigo-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                    {card.company && (
                      <p className="text-sm text-gray-600 truncate">{card.company}</p>
                    )}
                    {card.job_title && (
                      <p className="text-xs text-gray-500 truncate">{card.job_title}</p>
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
                  {card.image_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={card.image_url}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-8 w-8 text-indigo-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
                    {card.company && (
                      <p className="text-sm text-gray-600 truncate">{card.company}</p>
                    )}
                    {card.job_title && (
                      <p className="text-xs text-gray-500 truncate">{card.job_title}</p>
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
        <DialogContent className="max-w-2xl h-[100dvh] md:h-auto md:max-h-[90vh] overflow-y-auto md:overflow-y-auto p-4 md:p-6 fixed top-0 left-0 md:left-[50%] md:top-[50%] translate-x-0 md:translate-x-[-50%] translate-y-0 md:translate-y-[-50%] rounded-none md:rounded-lg w-full md:w-full">
          <DialogHeader className="pr-8 md:pr-0 pb-2 md:pb-4">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle className="flex-1 text-base md:text-lg">Business Card Details</DialogTitle>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="flex items-center gap-2 h-8 md:h-9"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                )}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditFormData(selectedCard || {});
                    }}
                    className="flex items-center gap-2 h-8 md:h-9"
                  >
                    <X className="h-4 w-4" />
                    <span className="hidden sm:inline">Cancel</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedCard && (
            <div className="space-y-3 md:space-y-6">
              {selectedCard.image_url && (
                <div 
                  className="w-full h-52 md:h-64 bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageViewerOpen(true)}
                >
                  <img
                    src={selectedCard.image_url}
                    alt={selectedCard.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2">Full name:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.name || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-gray-900">{selectedCard.name || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                    <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                    Company:
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.company || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-gray-900">{selectedCard.company || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2">Job Title:</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editFormData.job_title || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, job_title: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-gray-900">{selectedCard.job_title || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                    <Phone className="h-3 w-3 md:h-4 md:w-4" />
                    Phone:
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editFormData.phone || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-gray-900">{selectedCard.phone || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                    <Mail className="h-3 w-3 md:h-4 md:w-4" />
                    Email:
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editFormData.email || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-sm md:text-base text-gray-900 break-all">{selectedCard.email || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs md:text-sm font-medium text-gray-700 block mb-1 md:mb-2 flex items-center gap-2">
                    <Globe className="h-3 w-3 md:h-4 md:w-4" />
                    Website:
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={editFormData.website || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                      className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : selectedCard.website ? (
                    <a
                      href={selectedCard.website.startsWith('http') ? selectedCard.website : `https://${selectedCard.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm md:text-base text-indigo-600 hover:underline break-all"
                    >
                      {selectedCard.website}
                    </a>
                  ) : (
                    <p className="text-sm md:text-base text-gray-900">N/A</p>
                  )}
                </div>

              </div>

              {isEditing && (
                <div className="flex justify-end gap-2 pt-3 md:pt-4 border-t">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 text-sm md:text-base py-1.5 md:py-2"
                  >
                    <Save className="h-3 w-3 md:h-4 md:w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}

              <div className="pt-2 md:pt-4 border-t text-xs text-gray-500">
                <p>Uploaded by: {selectedCard.uploaded_by}</p>
                <p>Date: {new Date(selectedCard.created_at).toLocaleDateString()}</p>
              </div>

              {!isEditing && (
                <div className="pt-3 md:pt-4 border-t">
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center justify-center gap-2 text-sm md:text-base py-2 md:py-2"
                  >
                    <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Card'}
                  </Button>
                </div>
              )}
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
              <img
                src={selectedCard.image_url}
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
