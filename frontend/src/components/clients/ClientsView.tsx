import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useClients } from '../../context/ClientContext';
import { api } from '../../api';
import { Client, SocialAccount } from '../../types';
import {
  Building2,
  Plus,
  Edit,
  Save,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Share2,
  Sparkles,
  X,
  ExternalLink,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Trash2,
  Layers,
  Facebook,
  Instagram,
  Linkedin,
  FileText,
  UploadCloud,
  FileUp,
  Download,
  Film,
  Copy,
  Check,
  Image,
  File,
  Loader2,
} from 'lucide-react';
import { CreatePostModal } from '../posts/CreatePostModal';


export const ClientsView: React.FC = () => {
  const { role } = useAuth();
  const { clients, refreshClients, setSelectedClientId } = useClients();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'brand_knowledge' | 'documents' | 'profile' | 'accounts' | 'drive'>('brand_knowledge');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  // Documents & Assets state
  const [documents, setDocuments] = useState<any[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadTitle, setDocUploadTitle] = useState('');
  const [docUploadSummary, setDocUploadSummary] = useState('');
  const [docUploadFile, setDocUploadFile] = useState<File | null>(null);
  const [isDeletingDocId, setIsDeletingDocId] = useState<string | null>(null);
  const logoFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const docFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // AI Content Studio State
  const [aiContentType, setAiContentType] = useState<'REEL' | 'POST' | 'STORY'>('REEL');
  const [aiPlatform, setAiPlatform] = useState<'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_BUSINESS'>('INSTAGRAM');
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatedAiResult, setGeneratedAiResult] = useState<any | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showCreateModalWithPrefill, setShowCreateModalWithPrefill] = useState(false);

  // Form states for selected client's Brand Profile
  const [formData, setFormData] = useState({
    businessName: '',
    category: '',
    location: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    logo: '',
    approvalRequired: true,
    requiredBufferDays: 10,
    services: '',
    products: '',
    usp: '',
    targetAudience: '',
    brandTone: '',
    language: '',
    keywords: '',
    hashtags: '',
    preferredCta: '',
    openingHours: '',
    restrictedClaims: '',
    importantNotes: '',
  });


  // Select first client by default
  useEffect(() => {
    if (clients.length > 0 && !selectedClient) {
      loadClientDetails(clients[0].id);
    }
  }, [clients]);

  const loadClientDetails = async (id: string) => {
    try {
      const data = await api.getClient(id);
      setSelectedClient(data);
      setDocuments(data.documents || []);
      const bp = data.brandProfile;
      setFormData({
        businessName: data.businessName || '',
        category: data.category || '',
        location: data.location || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        description: data.description || '',
        logo: data.logo || '',
        approvalRequired: data.approvalRequired !== undefined ? data.approvalRequired : true,
        requiredBufferDays: data.requiredBufferDays || 10,
        services: bp?.services || '',
        products: bp?.products || '',
        usp: bp?.usp || '',
        targetAudience: bp?.targetAudience || '',
        brandTone: bp?.brandTone || 'Friendly + Premium',
        language: bp?.language || 'Hindi + English',
        keywords: bp?.keywords || '',
        hashtags: bp?.hashtags || '',
        preferredCta: bp?.preferredCta || '',
        openingHours: bp?.openingHours || '',
        restrictedClaims: bp?.restrictedClaims || '',
        importantNotes: bp?.importantNotes || '',
      });
    } catch (err) {
      console.error(err);
    }
  };


  const handleSaveBrandProfile = async () => {
    if (!selectedClient) return;
    setIsSaving(true);
    try {
      // 1. Update basic client info
      await api.updateClient(selectedClient.id, {
        businessName: formData.businessName,
        category: formData.category,
        location: formData.location,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        description: formData.description,
        logo: formData.logo,
        approvalRequired: formData.approvalRequired,
        requiredBufferDays: Number(formData.requiredBufferDays),
      });


      // 2. Update brand knowledge profile
      await api.updateBrandProfile(selectedClient.id, {
        services: formData.services,
        products: formData.products,
        usp: formData.usp,
        targetAudience: formData.targetAudience,
        brandTone: formData.brandTone,
        language: formData.language,
        keywords: formData.keywords,
        hashtags: formData.hashtags,
        preferredCta: formData.preferredCta,
        openingHours: formData.openingHours,
        restrictedClaims: formData.restrictedClaims,
        importantNotes: formData.importantNotes,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
      await refreshClients();
      await loadClientDetails(selectedClient.id);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const nextStatus = client.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
      await api.toggleClientStatus(client.id, nextStatus);
      setStatusNotification(`Client "${client.businessName}" marked as ${nextStatus}!`);
      setTimeout(() => setStatusNotification(null), 4000);
      await refreshClients();
      if (selectedClient?.id === client.id) {
        await loadClientDetails(client.id);
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteClient(clientToDelete.id);
      setStatusNotification(res.message || `Client "${clientToDelete.businessName}" and all associated data permanently deleted.`);
      setTimeout(() => setStatusNotification(null), 5000);

      const remainingClients = clients.filter((c) => c.id !== clientToDelete.id);
      await refreshClients();

      if (selectedClient?.id === clientToDelete.id) {
        if (remainingClients.length > 0) {
          setSelectedClientId(remainingClients[0].id);
          await loadClientDetails(remainingClients[0].id);
        } else {
          setSelectedClientId('ALL');
          setSelectedClient(null);
        }
      }
      setClientToDelete(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    try {
      setStatusNotification('Uploading client brand logo...');
      const uploaded = await api.uploadMedia(file);
      if (uploaded?.url) {
        setFormData((prev) => ({ ...prev, logo: uploaded.url }));
        await api.updateClient(selectedClient.id, { logo: uploaded.url });
        setSelectedClient((prev) => (prev ? { ...prev, logo: uploaded.url } : null));
        await refreshClients();
        setStatusNotification('Client logo updated successfully!');
        setTimeout(() => setStatusNotification(null), 3500);
      }
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
      setStatusNotification(null);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadFile || !selectedClient) return;

    setIsUploadingDoc(true);
    try {
      const uploaded = await api.uploadMedia(docUploadFile);
      const ext = docUploadFile.name.toLowerCase();
      const fileType = ext.endsWith('.pdf')
        ? 'PDF'
        : ext.endsWith('.txt')
        ? 'TXT'
        : ext.endsWith('.doc') || ext.endsWith('.docx')
        ? 'DOCX'
        : docUploadFile.type.includes('image')
        ? 'BROCHURE'
        : 'DOCUMENT';

      const newDoc = await api.createClientDocument(selectedClient.id, {
        title: docUploadTitle.trim() || docUploadFile.name,
        fileUrl: uploaded.url,
        fileType,
        fileSize: uploaded.size || docUploadFile.size,
        summary: docUploadSummary.trim() || undefined,
      });

      setDocuments((prev) => [newDoc, ...prev]);
      setDocUploadFile(null);
      setDocUploadTitle('');
      setDocUploadSummary('');
      if (docFileInputRef.current) docFileInputRef.current.value = '';

      setStatusNotification('Brand document added! AI will now extract knowledge from this file for content creation.');
      setTimeout(() => setStatusNotification(null), 4000);
    } catch (err: any) {
      alert(`Failed to upload document: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedClient) return;
    if (!confirm('Are you sure you want to remove this document from the client knowledge base?')) return;

    setIsDeletingDocId(docId);
    try {
      await api.deleteClientDocument(selectedClient.id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setStatusNotification('Document removed from knowledge base.');
      setTimeout(() => setStatusNotification(null), 3000);
    } catch (err: any) {
      alert(`Delete document failed: ${err.message}`);
    } finally {
      setIsDeletingDocId(null);
    }
  };

  const handleGenerateAiContent = async () => {
    if (!selectedClient) return;
    setIsGeneratingAi(true);
    setGeneratedAiResult(null);
    setCopiedCaption(false);
    try {
      const res = await api.generateAiCaption({
        clientId: selectedClient.id,
        contentType: aiContentType,
        platform: aiPlatform,
        topic: aiTopic.trim() || undefined,
      });
      setGeneratedAiResult(res);
    } catch (err: any) {
      alert(`AI content generation failed: ${err.message}`);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyCaption = () => {
    if (!generatedAiResult) return;
    const fullText = `${generatedAiResult.caption}\n\n${generatedAiResult.hashtags || ''}`.trim();
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 3000);
  };

  return (

    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#0172F4]" />
            <span>Clients & Brands Management</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add multiple separate clients, customize their unique AI brand voice, content rules, and connected social channels.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-[#0172F4] hover:bg-[#005cd3] text-white px-4 py-2 rounded-xl shadow-sm shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client / Brand</span>
        </button>
      </div>

      {/* Status Notification Banner */}
      {statusNotification && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold rounded-xl flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0172F4] shrink-0" />
          <span>{statusNotification}</span>
        </div>
      )}

      {/* Main 2-Column Interface: Client Selector on Left, Detail Hub on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Clients List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Client Brands ({clients.length})</span>
            <span className="text-[10px] text-gray-400">Click to edit</span>
          </div>

          <div className="space-y-2.5">
            {clients.map((c) => {
              const isSelected = selectedClient?.id === c.id;
              const isInactive = c.status === 'INACTIVE';
              return (
                <div
                  key={c.id}
                  onClick={() => loadClientDetails(c.id)}
                  className={`p-4 rounded-2xl cursor-pointer border transition shadow-xs ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-300 ring-2 ring-[#0172F4]'
                      : isInactive
                      ? 'bg-slate-50/80 border-slate-200 opacity-80 hover:opacity-100 hover:bg-slate-100/60'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.logo ? (
                        <img
                          src={c.logo}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover shadow-xs border border-gray-100 shrink-0 bg-white"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 ${
                            isInactive ? 'bg-slate-400' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}
                        >
                          {c.businessName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{c.businessName}</h4>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {c.category} • {c.location ? c.location.split(',')[0] : 'India'}
                        </span>
                      </div>
                    </div>


                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isInactive
                          ? 'bg-slate-100 text-slate-600 border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {isInactive ? 'INACTIVE' : 'ACTIVE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
                    <span>Buffer: {c.requiredBufferDays || 10} days</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={isInactive ? 'Click to Activate Client' : 'Click to Deactivate Client'}
                        onClick={(e) => handleToggleStatus(c, e)}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition ${
                          isInactive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        {isInactive ? 'Activate' : 'Deactivate'}
                      </button>

                      <button
                        type="button"
                        title="Delete client & all associated data"
                        onClick={(e) => {
                          e.stopPropagation();
                          setClientToDelete(c);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Client Hub (8 cols) */}
        <div className="lg:col-span-8">
          {selectedClient ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 shadow-xs">
              {/* Client Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="relative group/logo shrink-0">
                    {selectedClient.logo ? (
                      <img
                        src={selectedClient.logo}
                        alt=""
                        className="w-14 h-14 rounded-2xl object-cover shadow-md border-2 border-white ring-1 ring-gray-200 bg-white"
                      />
                    ) : (
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md ${
                          selectedClient.status === 'INACTIVE'
                            ? 'bg-slate-500'
                            : 'bg-gradient-to-br from-blue-600 to-indigo-700'
                        }`}
                      >
                        {selectedClient.businessName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      title="Upload or Change Logo"
                      className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover/logo:opacity-100 rounded-2xl flex flex-col items-center justify-center text-[9px] font-bold transition backdrop-blur-xs cursor-pointer"
                    >
                      <Image className="w-4 h-4 mb-0.5" />
                      <span>Logo</span>
                    </button>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{selectedClient.businessName}</h3>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          selectedClient.status === 'INACTIVE'
                            ? 'bg-slate-100 text-slate-600 border-slate-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {selectedClient.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#0172F4]" /> {selectedClient.location || 'Location Not Set'}
                      </span>
                      {selectedClient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" /> {selectedClient.phone}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-semibold text-[11px]">
                        {selectedClient.category}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(selectedClient)}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                      selectedClient.status === 'INACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {selectedClient.status === 'INACTIVE' ? 'Activate Brand' : 'Deactivate Brand'}
                  </button>

                  <button
                    onClick={() => setClientToDelete(selectedClient)}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1 shadow-xs"
                    title="Delete Client & Remove All Data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedClientId(selectedClient.id);
                      setStatusNotification(`Switched active brand in top bar to: ${selectedClient.businessName}`);
                      setTimeout(() => setStatusNotification(null), 3000);
                    }}
                    className="px-3 py-2 text-xs font-semibold border border-blue-200 bg-blue-50 text-[#0172F4] hover:bg-blue-100 rounded-xl transition shadow-xs"
                  >
                    Select As Active Brand
                  </button>

                  <button
                    onClick={handleSaveBrandProfile}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm shadow-emerald-600/20 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Saving...' : 'Save Knowledge'}</span>
                  </button>
                </div>
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-3 rounded-xl animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Brand profile saved! AI caption generation and scheduling will now use this updated context.</span>
                </div>
              )}

              {/* Hub Tabs */}
              <div className="flex items-center gap-1 border-b border-gray-100 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('brand_knowledge')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0 ${
                    activeTab === 'brand_knowledge'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0172F4]" />
                  <span>Brand Knowledge & AI Voice</span>
                </button>

                <button
                  onClick={() => setActiveTab('documents')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0 ${
                    activeTab === 'documents'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-[#0172F4]" />
                  <span>Brand Documents & Files ({documents.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0 ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Business Profile & Logo</span>
                </button>

                <button
                  onClick={() => setActiveTab('accounts')}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0 ${
                    activeTab === 'accounts'
                      ? 'bg-blue-50 text-[#0172F4] font-bold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Linked Social Channels ({selectedClient.socialAccounts?.length || 0})</span>
                </button>
              </div>


              {/* Tab 1: Brand Knowledge / AI Voice */}
              {activeTab === 'brand_knowledge' && (
                <div className="space-y-4 text-xs">
                  <p className="text-gray-500">
                    The AI generation engine tailors post captions, hashtags, and visual hooks specifically for this brand using the knowledge below.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Key Services Offered</label>
                      <textarea
                        rows={2}
                        value={formData.services}
                        onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                        placeholder="e.g. 2BHK/3BHK Luxury Flats, Commercial Office Space, Real Estate Advisory"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Products / Flagship Items</label>
                      <textarea
                        rows={2}
                        value={formData.products}
                        onChange={(e) => setFormData({ ...formData, products: e.target.value })}
                        placeholder="e.g. Skyline Towers, Green Valley Villas, Studio Suites"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Unique Selling Proposition (USP)</label>
                    <input
                      type="text"
                      value={formData.usp}
                      onChange={(e) => setFormData({ ...formData, usp: e.target.value })}
                      placeholder="e.g. 0% Brokerage, RERA Approved with 100% Home Loan Assistance"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Brand Tone</label>
                      <select
                        value={formData.brandTone}
                        onChange={(e) => setFormData({ ...formData, brandTone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      >
                        <option value="Friendly + Premium">Friendly + Premium</option>
                        <option value="Professional & Authoritative">Professional & Authoritative</option>
                        <option value="Casual & Youthful">Casual & Youthful</option>
                        <option value="Luxury & Exclusive">Luxury & Exclusive</option>
                        <option value="Bold & Disruptive">Bold & Disruptive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Target Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      >
                        <option value="Hindi + English (Hinglish)">Hindi + English (Hinglish)</option>
                        <option value="English Only">English Only</option>
                        <option value="Pure Hindi">Pure Hindi</option>
                        <option value="Regional (Marathi/Gujarati)">Regional (Marathi/Gujarati)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Target Audience</label>
                      <input
                        type="text"
                        value={formData.targetAudience}
                        onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                        placeholder="e.g. Families, Investors, Tech Professionals aged 25-45"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Primary Hashtags</label>
                      <input
                        type="text"
                        value={formData.hashtags}
                        onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
                        placeholder="#BrandSetu #RealEstate #DreamHome #InvestSmart"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Preferred Call to Action (CTA)</label>
                      <input
                        type="text"
                        value={formData.preferredCta}
                        onChange={(e) => setFormData({ ...formData, preferredCta: e.target.value })}
                        placeholder="e.g. DM us 'PROPERTY' or Call +91 98200 00000 for brochure"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Keywords for Social Monitoring & SEO</label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="luxury apartments, commercial retail, best investment pune"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                    />
                  </div>

                  {/* Test AI Content Studio Playground */}
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-purple-50/30 p-4 rounded-2xl border border-blue-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0172F4] text-white flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">Brand AI Content Studio (Live Tester)</h4>
                          <p className="text-[11px] text-gray-500">Generate reel scripts, hooks, and captions powered by this brand's knowledge & uploaded documents.</p>
                        </div>
                      </div>
                      {documents.length > 0 && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 self-start sm:self-auto shrink-0">
                          <FileText className="w-3 h-3" /> {documents.length} Docs Grounded
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Content Format</label>
                        <select
                          value={aiContentType}
                          onChange={(e) => setAiContentType(e.target.value as any)}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                        >
                          <option value="REEL">🎬 Video Reel / Hook</option>
                          <option value="POST">📸 Visual Post / Carousel</option>
                          <option value="STORY">⚡ Story Spotlight</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Target Channel</label>
                        <select
                          value={aiPlatform}
                          onChange={(e) => setAiPlatform(e.target.value as any)}
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                        >
                          <option value="INSTAGRAM">Instagram (Hooks + Emojis + Bio CTA)</option>
                          <option value="FACEBOOK">Facebook (Community + Local)</option>
                          <option value="GOOGLE_BUSINESS">Google Business (Local SEO)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">Topic / Campaign Angle (Optional)</label>
                        <input
                          type="text"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          placeholder="e.g. Festival offer, 0% brokerage, signature dish"
                          className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleGenerateAiContent}
                        disabled={isGeneratingAi}
                        className="flex items-center gap-1.5 text-xs font-bold bg-[#0172F4] hover:bg-[#005cd3] text-white px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        {isGeneratingAi ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Generating with Brand AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Generate Reel / Post Content</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Result Card */}
                    {generatedAiResult && (
                      <div className="p-3.5 bg-white rounded-xl border border-blue-200/80 shadow-xs space-y-3 animate-in fade-in">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100 text-[11px]">
                          <span className="font-bold text-gray-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>AI Content Generated</span>
                            <span className="text-[10px] font-mono text-gray-400">({generatedAiResult.aiModelUsed || 'BrandSetu Engine'})</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCopyCaption}
                              className="px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-[11px] flex items-center gap-1 transition"
                            >
                              {copiedCaption ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-gray-500" />}
                              <span>{copiedCaption ? 'Copied!' : 'Copy Caption'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowCreateModalWithPrefill(true)}
                              className="px-2.5 py-1 rounded-lg bg-[#0172F4] text-white font-semibold text-[11px] hover:bg-[#005cd3] transition shadow-xs flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Create Post from This</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                          {generatedAiResult.caption}
                        </div>

                        {generatedAiResult.hashtags && (
                          <div className="p-2.5 bg-blue-50/50 rounded-lg text-xs font-medium text-[#0172F4] leading-relaxed">
                            {generatedAiResult.hashtags}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Brand Documents & Knowledge Files */}
              {activeTab === 'documents' && (
                <div className="space-y-5 text-xs">
                  {/* Banner */}
                  <div className="p-4 bg-gradient-to-br from-purple-50/70 to-blue-50/50 border border-purple-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Client Brand Documents & Knowledge Base</h4>
                        <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                          Upload brochures, catalogs, menus, rate cards, and brand guides. BrandSetu AI analyzes these documents to create authentic, fact-checked social media captions and reels for <b>{selectedClient.businessName}</b>.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Form Card */}
                  <form onSubmit={handleUploadDocument} className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5">
                        <FileUp className="w-4 h-4 text-[#0172F4]" />
                        <span>Attach New Document to Client Knowledge</span>
                      </h4>
                      <span className="text-[11px] text-gray-400">PDF, DOC, TXT, Images (Max 50MB)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* File Selection Box */}
                      <div
                        onClick={() => docFileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 hover:border-[#0172F4] hover:bg-blue-50/20 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[110px]"
                      >
                        <input
                          ref={docFileInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.txt,image/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setDocUploadFile(f);
                              if (!docUploadTitle) {
                                setDocUploadTitle(f.name.replace(/\.[^/.]+$/, ''));
                              }
                            }
                          }}
                          className="hidden"
                        />
                        <UploadCloud className="w-7 h-7 text-gray-400 mb-1" />
                        {docUploadFile ? (
                          <div>
                            <p className="text-xs font-bold text-[#0172F4] truncate max-w-xs">{docUploadFile.name}</p>
                            <span className="text-[10px] text-gray-400">{(docUploadFile.size / 1024 / 1024).toFixed(2)} MB • Click to change</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-gray-800">Click or Drag & Drop Document</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Brochure, Menu, Rate Card, Brand Deck</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        <div>
                          <label className="block font-bold text-gray-700 mb-1 text-[11px]">Document Title *</label>
                          <input
                            type="text"
                            required
                            value={docUploadTitle}
                            onChange={(e) => setDocUploadTitle(e.target.value)}
                            placeholder="e.g. 2BHK Luxury Brochure, Rate Card 2026, Summer Menu"
                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-gray-700 mb-1 text-[11px]">Key Information / AI Notes (Optional)</label>
                          <textarea
                            rows={2}
                            value={docUploadSummary}
                            onChange={(e) => setDocUploadSummary(e.target.value)}
                            placeholder="e.g. 15% inaugural discount till Nov 10, prime location near metro, 3 amenities"
                            className="w-full bg-white border border-gray-200 rounded-xl p-2 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={!docUploadFile || isUploadingDoc}
                        className="flex items-center gap-1.5 text-xs font-bold bg-[#0172F4] hover:bg-[#005cd3] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                      >
                        {isUploadingDoc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Uploading & Indexing...</span>
                          </>
                        ) : (
                          <>
                            <FileUp className="w-3.5 h-3.5" />
                            <span>Attach Document to Knowledge Base</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Documents List */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="font-bold text-gray-900 text-xs">Attached Brand Knowledge Documents ({documents.length})</h4>
                      <span className="text-[11px] text-gray-400">Available to AI prompt engine</span>
                    </div>

                    {documents.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {documents.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs hover:border-gray-300 transition flex flex-col justify-between space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                                  doc.fileType === 'PDF' ? 'bg-rose-600' : doc.fileType === 'TXT' ? 'bg-amber-600' : 'bg-blue-600'
                                }`}>
                                  {doc.fileType || 'DOC'}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-gray-900 text-xs truncate" title={doc.title}>{doc.title}</h5>
                                  <span className="text-[10px] text-gray-400 block">
                                    {(doc.fileSize ? (doc.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'Document')} • {new Date(doc.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="View / Download Document"
                                  className="p-1.5 text-gray-500 hover:text-[#0172F4] hover:bg-blue-50 rounded-lg transition"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  title="Delete Document"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  disabled={isDeletingDocId === doc.id}
                                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {doc.summary && (
                              <div className="p-2 bg-gray-50 rounded-lg text-[11px] text-gray-600 border border-gray-100 line-clamp-2">
                                <span className="font-semibold text-gray-800">AI Context: </span>
                                {doc.summary}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl p-6 text-gray-400">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-gray-700 text-xs">No Brand Documents Attached Yet</p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                          Upload the client's menu, brochure, pricing or guidelines above so the BrandSetu AI can reference them to generate authentic, high-converting posts and reels.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Tab 2: Business Profile & Settings */}
              {activeTab === 'profile' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Business Name</label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Industry / Category</label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">City / Location</label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Website URL</label>
                      <input
                        type="text"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://clientwebsite.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Brand Logo URL or Image</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={formData.logo}
                          onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                          placeholder="https://... logo image or upload file"
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                        />
                        <button
                          type="button"
                          onClick={() => logoFileInputRef.current?.click()}
                          className="px-3 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shrink-0"
                        >
                          Upload
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Operational Controls */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <h4 className="font-bold text-gray-900 text-xs">Publishing & Safety Controls</h4>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-gray-800 block">Require Approval Before Publishing</span>
                        <span className="text-[11px] text-gray-500">
                          When ON, every post generated or scheduled must be approved in the Approvals queue.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.approvalRequired}
                        onChange={(e) => setFormData({ ...formData, approvalRequired: e.target.checked })}
                        className="w-4 h-4 rounded text-[#0172F4] focus:ring-[#0172F4] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div>
                        <span className="font-bold text-gray-800 block">Required Post Buffer (Days)</span>
                        <span className="text-[11px] text-gray-500">Minimum number of days of pre-scheduled posts before warning triggers.</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={formData.requiredBufferDays}
                        onChange={(e) => setFormData({ ...formData, requiredBufferDays: Number(e.target.value) })}
                        className="w-20 bg-white border border-gray-200 rounded-lg p-1.5 text-center font-bold text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Connected Social Accounts */}
              {activeTab === 'accounts' && (
                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900">Social Media Accounts for {selectedClient.businessName}</h4>
                      <p className="text-gray-500 text-[11px]">Channels authorized to automatically publish for this brand.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedClient.socialAccounts && selectedClient.socialAccounts.length > 0 ? (
                      selectedClient.socialAccounts.map((acc: any) => (
                        <div key={acc.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {acc.platform === 'INSTAGRAM' && <Instagram className="w-4 h-4 text-pink-600" />}
                            {acc.platform === 'FACEBOOK' && <Facebook className="w-4 h-4 text-blue-600" />}
                            {acc.platform === 'LINKEDIN' && <Linkedin className="w-4 h-4 text-blue-700" />}
                            <div>
                              <div className="font-bold text-gray-900">{acc.accountName}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{acc.accountId}</div>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {acc.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-8 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                        No social accounts specifically connected for this brand yet. Go to the "Channels" tab to link Instagram, Facebook, or LinkedIn.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">
              Select a client on the left or click "Add New Client / Brand" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-2xl border border-gray-200 p-6 space-y-4 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0172F4]" />
                <span>Add New Client Business Entity</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as any;
                try {
                  const newClient = await api.createClient({
                    businessName: form.businessName.value.trim(),
                    category: form.category.value.trim(),
                    location: form.location.value.trim(),
                    phone: form.phone.value.trim(),
                    email: form.email.value.trim(),
                    website: form.website.value.trim(),
                    approvalRequired: true,
                    requiredBufferDays: 10,
                  });

                  setShowAddModal(false);
                  await refreshClients();
                  await loadClientDetails(newClient.id);
                  alert(`Client "${newClient.businessName}" created successfully!`);
                } catch (err: any) {
                  alert(`Creation error: ${err.message}`);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-gray-700 font-bold mb-1">Business / Brand Name *</label>
                <input
                  name="businessName"
                  required
                  placeholder="e.g. Apex Dental Care, Royal Realty, Cafe Mocha"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Category / Industry *</label>
                  <input
                    name="category"
                    required
                    placeholder="e.g. Real Estate, Healthcare, Fashion"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">City / Location *</label>
                  <input
                    name="location"
                    required
                    placeholder="e.g. Pune, Mumbai, Delhi"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Contact Phone</label>
                  <input
                    name="phone"
                    placeholder="+91 98200 00000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Contact Email</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="client@business.com"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Website URL</label>
                <input
                  name="website"
                  placeholder="https://brandwebsite.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#0172F4]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0172F4] hover:bg-[#005cd3] text-white font-semibold shadow-sm shadow-blue-500/20 transition"
                >
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Client & Wipe All Data?</h3>
                <p className="text-xs text-rose-600 font-semibold mt-0.5">Permanent & Irreversible Action</p>
              </div>
            </div>

            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 space-y-2">
              <p>
                Are you sure you want to permanently delete <strong>{clientToDelete.businessName}</strong>?
              </p>
              <p className="font-semibold text-rose-700">
                ⚠️ All scheduled posts, published history, content media, brand profiles, and analytics for this client will be completely removed from the database and dashboard.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteClient}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md shadow-rose-500/20 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Client & All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Post Modal Prefilled from Brand AI */}
      {showCreateModalWithPrefill && selectedClient && (
        <CreatePostModal
          isOpen={true}
          onClose={() => setShowCreateModalWithPrefill(false)}
          defaultClientId={selectedClient.id}
          defaultCaption={generatedAiResult ? `${generatedAiResult.caption}\n\n${generatedAiResult.hashtags || ''}` : ''}
          defaultContentType={aiContentType}
          onPostCreated={() => {
            setShowCreateModalWithPrefill(false);
            refreshClients();
          }}
        />
      )}
    </div>
  );
};

