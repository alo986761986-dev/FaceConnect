/**
 * Facebook-style Profile Page
 * Complete profile matching Italian Facebook UI
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Menu, Search, MoreHorizontal, Camera, ChevronDown, Plus, Pencil,
  MapPin, Home, Cake, Heart, Globe, Link as LinkIcon, Instagram,
  Image as ImageIcon, Video, Users, Filter, MessageCircle, Share2,
  ThumbsUp, X, Settings, Eye, Lock, UserPlus, Clock
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import BottomNav from "@/components/BottomNav";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Sample profile data
const PROFILE_DATA = {
  name: 'Alfonso Neri',
  username: '@alfonso_neridj',
  friendsCount: 462,
  postsCount: 44,
  bio: 'DJ [Alfonso Neri] è un producer e performer conosciuto per i suoi set energici e per un sound',
  location: 'Naples',
  hometown: 'Napoli',
  birthday: '26 maggio 1986',
  relationship: 'Single',
  language: 'Italiano',
  instagramHandle: '0029VbBNt7h9cDDVcBITIp34',
  instagramUrl: 'instagram.com/alfonso_neridj',
  coverPhoto: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=400&fit=crop',
  profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
  verified: false
};

// Sample mutual friends
const MUTUAL_FRIENDS = [
  { id: '1', name: 'Maria', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
  { id: '2', name: 'Luca', photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop' },
  { id: '3', name: 'Anna', photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
];

// Sample friends for the friends section
const FRIENDS_LIST = [
  { 
    id: '1', 
    name: 'Enza De Caprio', 
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    time: '3 h',
    mutualFriends: 1,
    isOnline: false
  },
  { 
    id: '2', 
    name: 'Mary Jo Corsaro', 
    photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=100&h=100&fit=crop',
    time: '6 m',
    newPosts: 2,
    isOnline: false
  },
  { 
    id: '3', 
    name: 'Angela Luigi Luc...', 
    photo: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop',
    isOnline: true
  },
  { 
    id: '4', 
    name: 'Radulescu Aurelia', 
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
    time: '1 h',
    newPosts: 2,
    isOnline: false
  },
];

// Sample posts
const SAMPLE_POSTS = [
  {
    id: '1',
    author: {
      name: 'Marita Copeta',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
    },
    taggedWith: ['Ale Mastro'],
    othersCount: 88,
    date: '19 gen',
    privacy: 'friends',
    content: 'Grande serata al club! 🎉',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop',
    likes: 124,
    comments: 23,
    shares: 5
  },
  {
    id: '2',
    author: {
      name: 'Alfonso Neri',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
    },
    date: '15 gen',
    privacy: 'public',
    content: 'Nuovo set disponibile! Link in bio 🎧🔥',
    image: 'https://images.unsplash.com/photo-1571266028243-d220c6e5a9d6?w=600&h=400&fit=crop',
    likes: 256,
    comments: 45,
    shares: 12
  }
];

// Profile tabs
const PROFILE_TABS = [
  { id: 'all', label: 'Tutti' },
  { id: 'photos', label: 'Foto' },
  { id: 'reels', label: 'Reels' },
  { id: 'memories', label: 'Ricordi' }
];

// Friend Card Component
function FriendCard({ friend }) {
  return (
    <div className="flex flex-col items-center min-w-[90px] max-w-[90px]">
      <div className="relative mb-2">
        <Avatar className="w-20 h-20 border-2 border-gray-200">
          <AvatarImage src={friend.photo} />
          <AvatarFallback>{friend.name[0]}</AvatarFallback>
        </Avatar>
        
        {/* Online indicator */}
        {friend.isOnline && (
          <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
        
        {/* Time badge */}
        {friend.time && !friend.isOnline && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
            {friend.time}
          </div>
        )}
      </div>
      
      <span className="text-sm font-medium text-gray-900 text-center line-clamp-2">
        {friend.name}
      </span>
      
      {friend.mutualFriends && (
        <span className="text-xs text-gray-500 text-center">
          {friend.mutualFriends} amicizia in comune
        </span>
      )}
      
      {friend.newPosts && (
        <span className="text-xs text-gray-500 text-center">
          Nuovi: {friend.newPosts}
        </span>
      )}
    </div>
  );
}

// Post Card Component
function PostCard({ post }) {
  const [liked, setLiked] = useState(false);
  
  return (
    <div className="bg-white border-t border-gray-100" data-testid={`post-${post.id}`}>
      {/* Post Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={post.author.photo} />
            <AvatarFallback>{post.author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">{post.author.name}</span>
              {post.taggedWith && (
                <>
                  <span className="text-sm text-gray-600">è con</span>
                  <span className="font-semibold text-sm text-gray-900">{post.taggedWith[0]}</span>
                  {post.othersCount && (
                    <span className="text-sm text-gray-600">e altri {post.othersCount}.</span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>{post.date}</span>
              <span>·</span>
              {post.privacy === 'public' ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Users className="w-3 h-3" />
              )}
            </div>
          </div>
        </div>
        <button className="p-2">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      {/* Post Content */}
      {post.content && (
        <p className="px-3 pb-2 text-sm text-gray-900">{post.content}</p>
      )}
      
      {/* Post Image */}
      {post.image && (
        <img src={post.image} alt="" className="w-full" />
      )}
      
      {/* Engagement Stats */}
      <div className="flex items-center justify-between px-3 py-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <ThumbsUp className="w-3 h-3 text-white" fill="white" />
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Heart className="w-3 h-3 text-white" fill="white" />
            </div>
          </div>
          <span>{post.likes}</span>
        </div>
        <div className="flex gap-3">
          <span>{post.comments} commenti</span>
          <span>{post.shares} condivisioni</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex border-t border-gray-100">
        <button 
          onClick={() => setLiked(!liked)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 ${
            liked ? 'text-blue-500' : 'text-gray-500'
          }`}
        >
          <ThumbsUp className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
          <span className="text-sm font-medium">Mi piace</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Commenta</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-500">
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Condividi</span>
        </button>
      </div>
    </div>
  );
}

// Edit Profile Modal
function EditProfileModal({ isOpen, onClose, profile, onSave }) {
  const [formData, setFormData] = useState({
    bio: profile.bio,
    location: profile.location,
    hometown: profile.hometown,
    relationship: profile.relationship
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
        data-testid="edit-profile-modal"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="text-lg font-bold">Modifica profilo</h2>
          <button 
            onClick={() => {
              onSave(formData);
              onClose();
            }}
            className="text-blue-600 font-semibold"
          >
            Salva
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl resize-none"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Città attuale</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Città natale</label>
            <input
              type="text"
              value={formData.hometown}
              onChange={(e) => setFormData({...formData, hometown: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Situazione sentimentale</label>
            <select
              value={formData.relationship}
              onChange={(e) => setFormData({...formData, relationship: e.target.value})}
              className="w-full p-3 border border-gray-200 rounded-xl"
            >
              <option value="Single">Single</option>
              <option value="In una relazione">In una relazione</option>
              <option value="Fidanzato/a">Fidanzato/a</option>
              <option value="Sposato/a">Sposato/a</option>
              <option value="Complicato">Complicato</option>
            </select>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Main Profile Page
export default function Profile() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [profile, setProfile] = useState(PROFILE_DATA);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  const handleEditProfile = (updates) => {
    setProfile(prev => ({ ...prev, ...updates }));
    toast.success('Profilo aggiornato!');
  };

  const handleCreatePost = () => {
    toast.info('Apertura creazione post...');
    navigate('/create-reel');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20" data-testid="profile-page">
      <ScrollArea className="h-[calc(100vh-80px)]">
        {/* Cover Photo Section */}
        <div className="relative">
          {/* Cover Image */}
          <div className="relative h-48 bg-gray-800">
            <img 
              src={profile.coverPhoto} 
              alt="Cover"
              className="w-full h-full object-cover"
            />
            
            {/* Cover Photo Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            
            {/* Header Buttons */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-full bg-black/30"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <div className="flex gap-2">
                <button className="p-2 rounded-full bg-black/30">
                  <Pencil className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 rounded-full bg-black/30">
                  <Search className="w-5 h-5 text-white" />
                </button>
                <button 
                  onClick={() => setShowOptionsMenu(true)}
                  className="p-2 rounded-full bg-black/30"
                >
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* "Leave a thought" bubble */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
              <div className="bg-white/90 px-4 py-2 rounded-full text-sm text-gray-600">
                Lascia un tuo pensiero...
              </div>
            </div>
            
            {/* Camera icon on cover */}
            <button className="absolute bottom-3 right-3 p-2 rounded-full bg-black/30">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Profile Photo */}
          <div className="absolute -bottom-16 left-4">
            <div className="relative">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={profile.profilePhoto} />
                <AvatarFallback className="text-3xl">{profile.name[0]}</AvatarFallback>
              </Avatar>
              <button className="absolute bottom-2 right-2 p-2 rounded-full bg-gray-200 shadow">
                <Camera className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Profile Info Section */}
        <div className="bg-white pt-20 px-4 pb-4">
          {/* Name and Stats */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                <button>
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-gray-600">
                <span className="font-medium">{profile.friendsCount}</span> amici · <span className="font-medium">{profile.postsCount}</span> post
              </p>
            </div>
          </div>
          
          {/* Bio */}
          <p className="text-gray-700 mb-3 text-sm leading-relaxed">
            {profile.bio}
          </p>
          
          {/* Location & Instagram */}
          <div className="flex items-center gap-2 text-gray-600 mb-3 text-sm">
            <MapPin className="w-4 h-4" />
            <span>{profile.location}</span>
            <span>·</span>
            <Instagram className="w-4 h-4" />
            <span className="font-medium">{profile.instagramHandle}</span>
          </div>
          
          {/* Mutual Friends */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {MUTUAL_FRIENDS.map(friend => (
                <Avatar key={friend.id} className="w-8 h-8 border-2 border-white">
                  <AvatarImage src={friend.photo} />
                  <AvatarFallback>{friend.name[0]}</AvatarFallback>
                </Avatar>
              ))}
              <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                <MoreHorizontal className="w-4 h-4 text-gray-600" />
              </div>
            </div>
            <span className="text-sm text-gray-600">Amici con cose in comune</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={handleCreatePost}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-lg font-semibold"
              data-testid="create-btn"
            >
              <Plus className="w-5 h-5" />
              Crea
            </button>
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-200 text-gray-900 rounded-lg font-semibold"
              data-testid="edit-profile-btn"
            >
              <Pencil className="w-5 h-5" />
              Modifica profilo
            </button>
          </div>
          
          {/* Content Tabs */}
          <div className="flex border-b border-gray-200">
            {PROFILE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Personal Details Section */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Dettagli personali</h2>
            <button className="p-2">
              <Pencil className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">{profile.hometown}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">{profile.hometown}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Cake className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">{profile.birthday}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Heart className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">{profile.relationship}</span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Globe className="w-5 h-5 text-gray-600" />
              </div>
              <span className="text-gray-900">{profile.language}</span>
            </div>
          </div>
        </div>
        
        {/* Link Section */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Link</h2>
            <button className="p-2">
              <Pencil className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-gray-600" />
            </div>
            <a href={`https://${profile.instagramUrl}`} className="text-blue-600">
              {profile.instagramUrl}
            </a>
          </div>
        </div>
        
        {/* Contact Info Section */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Informazioni di contatto</h2>
            <button className="p-2">
              <Pencil className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-600 font-bold">@</span>
            </div>
            <span className="text-gray-900">{profile.instagramHandle}</span>
          </div>
        </div>
        
        {/* Friends Section */}
        <div className="bg-white mt-2 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Amici</h2>
            <button className="text-blue-600 font-medium text-sm">
              Mostra tutto
            </button>
          </div>
          
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2">
              {FRIENDS_LIST.map(friend => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
          </ScrollArea>
        </div>
        
        {/* Posts Section */}
        <div className="bg-white mt-2">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-bold text-gray-900">Tutti i post</h2>
            <button className="text-blue-600 font-medium text-sm">
              Filtri
            </button>
          </div>
          
          {/* Post Composer */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={profile.profilePhoto} />
                <AvatarFallback>{profile.name[0]}</AvatarFallback>
              </Avatar>
              <button 
                onClick={handleCreatePost}
                className="flex-1 text-left text-gray-500 bg-gray-100 rounded-full px-4 py-2.5"
              >
                A cosa stai pensando?
              </button>
              <button className="p-2">
                <ImageIcon className="w-6 h-6 text-green-500" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button 
                onClick={() => navigate('/create-reel')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
              >
                <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Reel</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
                  <Video className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">Diretta</span>
              </button>
            </div>
          </div>
          
          {/* Manage Posts Button */}
          <button className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 font-medium border-t border-gray-200">
            <MessageCircle className="w-5 h-5" />
            Gestisci post
          </button>
          
          {/* Posts Feed */}
          {SAMPLE_POSTS.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
        
        {/* Spacer for bottom nav */}
        <div className="h-4" />
      </ScrollArea>
      
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            profile={profile}
            onSave={handleEditProfile}
          />
        )}
      </AnimatePresence>
      
      {/* Options Menu Modal */}
      <AnimatePresence>
        {showOptionsMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowOptionsMenu(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
                <Settings className="w-6 h-6 text-gray-700" />
                <span className="text-base text-gray-900">Impostazioni profilo</span>
              </button>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
                <Eye className="w-6 h-6 text-gray-700" />
                <span className="text-base text-gray-900">Visualizza come</span>
              </button>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
                <Lock className="w-6 h-6 text-gray-700" />
                <span className="text-base text-gray-900">Privacy</span>
              </button>
              <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl">
                <Clock className="w-6 h-6 text-gray-700" />
                <span className="text-base text-gray-900">Archivio</span>
              </button>
              <button 
                onClick={() => setShowOptionsMenu(false)}
                className="w-full mt-2 p-4 text-center text-blue-600 font-medium"
              >
                Annulla
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
