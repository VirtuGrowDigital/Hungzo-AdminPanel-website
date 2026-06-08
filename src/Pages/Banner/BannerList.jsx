import React, { useState, useEffect } from 'react';
import { BannersList, DeleteBanner, updateBanner } from '../../Api';
import { fetchCategories, myProducts } from '../../Api';
import { toast } from 'react-hot-toast';
import { X, Upload, Image as ImageIcon, Trash2, Check, Eye, AlertCircle } from 'lucide-react';

const BannerList = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    actionType: 'CATEGORY',
    actionId: '',
    targetUrl: '',
    displayOrder: '0',
    startsAt: '',
    endsAt: '',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  useEffect(() => {
    loadBanners();
    loadCategoriesAndProducts();
  }, []);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await BannersList();
      
      if (res?.ok) {
        const bannersData = res?.data?.banners || [];
        setBanners(Array.isArray(bannersData) ? bannersData : []);
      } else {
        setError(res?.message || 'Failed to load banners');
        toast.error(res?.message || "Failed to load banners");
      }
    } catch (err) {
      setError('Error loading banners');
      toast.error("Error loading banners");
      console.error('Error loading banners:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoriesAndProducts = async () => {
    try {
      // Load categories
      const categoriesRes = await fetchCategories();
      if (categoriesRes?.ok) {
        const categoriesData = categoriesRes.categories || [];
        const activeCategories = categoriesData.filter(cat => cat.isActive === true);
        setCategories(activeCategories);
      }

      // Load products
      const productsRes = await myProducts();
      if (productsRes?.ok) {
        const productsData = productsRes.data?.products || [];
        setProducts(Array.isArray(productsData) ? productsData : []);
      }
    } catch (err) {
      console.error('Error loading categories/products:', err);
    }
  };

  const deleteBanner = async (id) => {
    if (window.confirm('Are you sure you want to delete this banner?')) {
      try {
        await DeleteBanner(id);
        setBanners(banners.filter(banner => banner._id !== id));
        toast.success('Banner deleted successfully');
      } catch (err) {
        toast.error('Failed to delete banner');
        console.error('Error deleting banner:', err);
      }
    }
  };

  const handleEditClick = (banner) => {
    setEditingBanner(banner);
    setEditFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      actionType: banner.actionType || 'CATEGORY',
      actionId:
        typeof banner.actionId === 'object' ? banner.actionId?._id || '' : banner.actionId || '',
      targetUrl: banner.targetUrl || '',
      displayOrder: String(banner.displayOrder ?? 0),
      startsAt: banner.startsAt ? new Date(banner.startsAt).toISOString().slice(0, 16) : '',
      endsAt: banner.endsAt ? new Date(banner.endsAt).toISOString().slice(0, 16) : '',
      isActive: banner.isActive ?? true,
    });
    setExistingImages(Array.isArray(banner.images) ? banner.images.slice(0, 1) : []);
    setSelectedImages([]);
    setImagePreviews([]);
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleCloseModal = () => {
    setShowEditModal(false);
    setEditingBanner(null);
      setEditFormData({
        title: '',
        subtitle: '',
        description: '',
        actionType: 'CATEGORY',
        actionId: '',
        targetUrl: '',
        displayOrder: '0',
        startsAt: '',
        endsAt: '',
        isActive: true,
      });
    setSelectedImages([]);
    setImagePreviews([]);
    setExistingImages([]);
    setFormErrors({});
    setShowImagePreview(false);
  };

  const validateForm = () => {
    const errors = {};
    
    // Validate title
    if (!editFormData.title.trim()) {
      errors.title = 'Title is required';
    }
    
    // Validate actionId based on actionType
    if (editFormData.actionType !== 'NONE' && editFormData.actionType !== 'URL') {
      if (!editFormData.actionId) {
        errors.actionId = `${editFormData.actionType === 'CATEGORY' ? 'Category' : 'Product'} selection is required`;
      }
    }

    if (editFormData.actionType === 'URL' && !/^https?:\/\//i.test(editFormData.targetUrl.trim())) {
      errors.targetUrl = 'Target URL must start with http:// or https://';
    }

    if (
      editFormData.startsAt &&
      editFormData.endsAt &&
      editFormData.startsAt > editFormData.endsAt
    ) {
      errors.endsAt = 'End time must be after start time';
    }
    
    // Validate images
    if (existingImages.length === 0 && selectedImages.length === 0) {
      errors.images = 'At least one image is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setEditFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setEditFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Validate each file
    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      if (!file.type.match('image.*')) {
        invalidFiles.push(`${file.name} - Not an image file`);
      } else if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name} - Size exceeds 5MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`Invalid files:\n${invalidFiles.join('\n')}`);
    }

    if (validFiles.length > 0) {
      if (validFiles.length > 1) {
        toast("Only one banner image can be uploaded. Using the first selected file.");
      }

      const newPreview = URL.createObjectURL(validFiles[0]);

      setSelectedImages([validFiles[0]]);
      setImagePreviews([newPreview]);
      
      // Clear image error if images are added
      if (formErrors.images) {
        setFormErrors(prev => ({
          ...prev,
          images: ''
        }));
      }
    }
  };

  const removeSelectedImage = () => {
    setSelectedImages([]);
    setImagePreviews([]);
  };

  const handleUpdateBanner = async () => {
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      
      // Append all form fields
      formData.append('title', editFormData.title.trim());
      formData.append('subtitle', editFormData.subtitle.trim());
      formData.append('description', editFormData.description.trim());
      formData.append('actionType', editFormData.actionType);
      formData.append('isActive', editFormData.isActive.toString());
      formData.append('displayOrder', editFormData.displayOrder || '0');
      
      // Only append actionId if type is not 'None' and it exists
      if (
        editFormData.actionType !== 'NONE' &&
        editFormData.actionType !== 'URL' &&
        editFormData.actionId
      ) {
        formData.append('actionId', editFormData.actionId);
      }

      if (editFormData.actionType === 'URL' && editFormData.targetUrl.trim()) {
        formData.append('targetUrl', editFormData.targetUrl.trim());
      }

      if (editFormData.startsAt) {
        formData.append('startsAt', new Date(editFormData.startsAt).toISOString());
      }

      if (editFormData.endsAt) {
        formData.append('endsAt', new Date(editFormData.endsAt).toISOString());
      }

      if (selectedImages[0]) {
        formData.append('images', selectedImages[0]);
      }

      const response = await updateBanner(editingBanner._id, formData);

      if (response.ok || response.success) {
        toast.success(response.data?.message || 'Banner updated successfully');
        
        // Reload banners to get updated data
        await loadBanners();
        
        handleCloseModal();
      } else {
        toast.error(response.message || response.error?.message || 'Failed to update banner');
      }
    } catch (err) {
      console.error('Error updating banner:', err);
      toast.error('An error occurred while updating the banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  const getActionTypeDisplay = (actionType) => {
    switch (actionType) {
      case 'CATEGORY': return 'Category';
      case 'PRODUCT': return 'Product';
      case 'URL': return 'URL';
      case 'NONE': return 'No action';
      default: return actionType;
    }
  };

  const getActionTypeColor = (actionType) => {
    switch (actionType) {
      case 'CATEGORY': return 'bg-blue-100 text-blue-800';
      case 'PRODUCT': return 'bg-purple-100 text-purple-800';
      case 'URL': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openImagePreview = (index) => {
    setPreviewImageIndex(index);
    setShowImagePreview(true);
  };

  const closeImagePreview = () => {
    setShowImagePreview(false);
  };

  // Get submit button disabled state
  const isSubmitDisabled = () => {
    return isSubmitting || 
           !editFormData.title.trim() || 
           ((editFormData.actionType !== 'NONE' && editFormData.actionType !== 'URL' && !editFormData.actionId) ||
           (editFormData.actionType === 'URL' && !editFormData.targetUrl.trim())) ||
           (existingImages.length === 0 && selectedImages.length === 0);
  };

  // Get submit button text
  const getSubmitButtonText = () => {
    if (isSubmitting) return 'Updating...';
    
    const errors = [];
    if (!editFormData.title.trim()) errors.push('title');
    if (editFormData.actionType !== 'NONE' && editFormData.actionType !== 'URL' && !editFormData.actionId) errors.push('action selection');
    if (editFormData.actionType === 'URL' && !editFormData.targetUrl.trim()) errors.push('target URL');
    if (existingImages.length === 0 && selectedImages.length === 0) errors.push('at least one image');
    
    if (errors.length > 0) {
      return `Update Banner (Missing: ${errors.join(', ')})`;
    }
    
    return 'Update Banner';
  };

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    };
  }, [imagePreviews]);

  if (loading) {
    return (
      <div className="px-6 py-2 flex items-center justify-center h-[62vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading banners...</p>
        </div>
      </div>
    );
  }

  if (error && banners.length === 0) {
    return (
      <div className="px-6 py-2">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadBanners}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 py-2">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Banner Posters</h2>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{banners.length}</span> banner{banners.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={loadBanners}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto h-[62vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Banner Images
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {banners.length > 0 ? (
                banners.map((banner) => (
                  <tr key={banner._id} className="hover:bg-gray-50 transition-colors duration-150">
                    {/* Banner Images */}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {banner.images && banner.images.length > 0 ? (
                          banner.images.slice(0, 3).map((image, index) => (
                            <div key={index} className="relative group">
                              <div className="w-24 h-16 rounded-md overflow-hidden border border-gray-200">
                                <img
                                  className="h-full w-full object-cover"
                                  src={image}
                                  alt={`${banner.title} - ${index + 1}`}
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/96x64?text=Image';
                                  }}
                                />
                              </div>
                              {banner.images.length > 3 && index === 2 && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-md">
                                  <span className="text-white text-xs font-medium">
                                    +{banner.images.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="w-24 h-16 rounded-md bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400 text-xs">No Images</span>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {banner.images?.length || 0} image{banner.images?.length !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Details */}
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{banner.title}</div>
                      {banner.subtitle && (
                        <div className="mt-1 text-xs text-gray-600">{banner.subtitle}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">ID: {banner._id.substring(0, 8)}...</div>
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(banner.createdAt)} by {banner.createdBy?.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Updated: {formatDate(banner.updatedAt)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Order: {banner.displayOrder ?? 0}
                      </div>
                      {(banner.startsAt || banner.endsAt) && (
                        <div className="mt-1 text-xs text-gray-500">
                          Window: {banner.startsAt ? formatDate(banner.startsAt) : 'Now'} to {banner.endsAt ? formatDate(banner.endsAt) : 'No end'}
                        </div>
                      )}
                    </td>

                    {/* Action Info */}
                    <td className="px-6 py-4">
                      <div className="mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(banner.actionType)}`}>
                          {getActionTypeDisplay(banner.actionType)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Ref: {banner.actionRef || banner.actionType || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {banner.actionType === 'URL'
                          ? `URL: ${banner.targetUrl || 'N/A'}`
                          : `ID: ${
                              banner.actionTarget?.id?.substring?.(0, 8) ||
                              (typeof banner.actionId === 'string'
                                ? banner.actionId.substring(0, 8)
                                : 'N/A')
                            }${
                              banner.actionTarget?.id || typeof banner.actionId === 'string'
                                ? '...'
                                : ''
                            }`}
                      </div>
                      {banner.actionTarget?.name && (
                        <div className="text-xs text-gray-500 mt-1">
                          Target: {banner.actionTarget.name}
                        </div>
                      )}
                      {banner.actionType === 'PRODUCT' && banner.actionTarget?.categoryName && (
                        <div className="text-xs text-gray-500">
                          Category: {banner.actionTarget.categoryName}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(banner.isActive)}`}>
                        {getStatusText(banner.isActive)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEditClick(banner)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBanner(banner._id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6" />
                      </svg>
                      <h3 className="mt-4 text-lg font-medium text-gray-900">No banners found</h3>
                      <p className="mt-1 text-sm text-gray-600">Get started by creating a new banner.</p>
                      <button
                        onClick={loadBanners}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Refresh List
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Banner Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Banner</h3>
                <p className="text-sm text-gray-500">Update banner details and images</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banner Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={editFormData.title}
                      onChange={handleEditChange}
                      className={`w-full px-3 py-2 border ${formErrors.title ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      placeholder="Enter banner title"
                      required
                    />
                    {formErrors.title && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {formErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      name="subtitle"
                      value={editFormData.subtitle}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional supporting line"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Optional banner description"
                    />
                  </div>

                  {/* Action Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <select
                      name="actionType"
                      value={editFormData.actionType}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="CATEGORY">Category</option>
                      <option value="PRODUCT">Product</option>
                      <option value="URL">URL</option>
                      <option value="NONE">None</option>
                    </select>
                  </div>

                  {/* Action ID Selection */}
                  {editFormData.actionType !== 'NONE' && editFormData.actionType !== 'URL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {editFormData.actionType === 'CATEGORY' ? 'Select Category *' : 'Select Product *'}
                      </label>
                      <select
                        name="actionId"
                        value={editFormData.actionId}
                        onChange={handleEditChange}
                        className={`w-full px-3 py-2 border ${formErrors.actionId ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        required={editFormData.actionType !== 'NONE'}
                      >
                        <option value="">
                          Select {editFormData.actionType === 'CATEGORY' ? 'a category' : 'a product'}
                        </option>
                        {(editFormData.actionType === 'CATEGORY' ? categories : products).map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name || item.title || `Item ${item._id.substring(0, 6)}`}
                          </option>
                        ))}
                      </select>
                      {formErrors.actionId && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.actionId}
                        </p>
                      )}
                    </div>
                  )}

                  {editFormData.actionType === 'URL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Target URL *
                      </label>
                      <input
                        type="url"
                        name="targetUrl"
                        value={editFormData.targetUrl}
                        onChange={handleEditChange}
                        className={`w-full px-3 py-2 border ${formErrors.targetUrl ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="https://example.com/promo"
                      />
                      {formErrors.targetUrl && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.targetUrl}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Display order
                      </label>
                      <input
                        type="number"
                        min="0"
                        name="displayOrder"
                        value={editFormData.displayOrder}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center p-3 bg-gray-50 rounded-md">
                      <input
                        type="checkbox"
                        name="isActive"
                        id="editIsActive"
                        checked={editFormData.isActive}
                        onChange={handleEditChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="editIsActive" className="ml-2 block text-sm text-gray-700">
                        Active banner
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Starts at
                      </label>
                      <input
                        type="datetime-local"
                        name="startsAt"
                        value={editFormData.startsAt}
                        onChange={handleEditChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ends at
                      </label>
                      <input
                        type="datetime-local"
                        name="endsAt"
                        value={editFormData.endsAt}
                        onChange={handleEditChange}
                        className={`w-full px-3 py-2 border ${formErrors.endsAt ? 'border-red-300' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      />
                      {formErrors.endsAt && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {formErrors.endsAt}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Images */}
                <div className="space-y-4">
                  {/* Existing Images */}
                  {existingImages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Image
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {existingImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <div className="w-28 h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                              <img
                                src={image}
                                alt={`Existing ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://via.placeholder.com/112x80?text=Image';
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => openImagePreview(index)}
                                  className="p-1 bg-white bg-opacity-90 rounded-full m-1 hover:bg-opacity-100 transition-all"
                                  title="View"
                                >
                                  <Eye className="w-4 h-4 text-gray-700" />
                                </button>
                               
                              </div>
                            </div>
                            <div className="text-xs text-center mt-1 text-gray-500">
                              Current
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Images */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Replace Image
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {/* Image Upload Button */}
                      <div className="w-28 h-20 border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="editBannerImages"
                        />
                        <label htmlFor="editBannerImages" className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                          <Upload className="w-8 h-8 text-gray-400 mb-1" />
                          <span className="text-xs text-gray-500 text-center px-2">Upload Image</span>
                        </label>
                      </div>

                      {/* Selected New Images */}
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <div className="w-28 h-20 rounded-md overflow-hidden border border-gray-200 bg-gray-50">
                            <img
                              src={imagePreviews[index]}
                              alt="Replacement preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openImagePreview(existingImages.length + index)}
                                className="p-1 bg-white bg-opacity-90 rounded-full m-1 hover:bg-opacity-100 transition-all"
                                title="View"
                              >
                                <Eye className="w-4 h-4 text-gray-700" />
                              </button>
                              <button
                                type="button"
                                onClick={removeSelectedImage}
                                className="p-1 bg-red-500 text-white rounded-full m-1 hover:bg-red-600 transition-all"
                                title="Remove"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-center mt-1 text-gray-500">
                            Replacement
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      One image only. Max 5MB. Supports JPG, PNG, WebP.
                    </p>
                    {formErrors.images && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {formErrors.images}
                      </p>
                    )}
                  </div>

                  {/* Image Summary */}
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-700 mb-2">Image Summary</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Current image:</span>
                        <span className={`font-medium ${existingImages.length === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                          {existingImages.length}
                          {existingImages.length === 0 && ' (Required)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Replacement image:</span>
                        <span className="font-medium text-blue-600">{selectedImages.length}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span>Total after update:</span>
                        <span className={`font-medium ${((selectedImages.length > 0 ? selectedImages.length : existingImages.length) === 0) ? 'text-red-600' : 'text-green-600'}`}>
                          {selectedImages.length > 0 ? selectedImages.length : existingImages.length}
                          {((selectedImages.length > 0 ? selectedImages.length : existingImages.length) === 0) && ' (At least 1 required)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Validation Summary */}
                  {(formErrors.title || formErrors.actionId || formErrors.targetUrl || formErrors.endsAt || formErrors.images) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-sm font-medium text-red-800 mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Please fix the following errors:
                      </div>
                      <ul className="text-xs text-red-600 space-y-1">
                        {formErrors.title && <li>• {formErrors.title}</li>}
                        {formErrors.actionId && <li>• {formErrors.actionId}</li>}
                        {formErrors.targetUrl && <li>• {formErrors.targetUrl}</li>}
                        {formErrors.endsAt && <li>• {formErrors.endsAt}</li>}
                        {formErrors.images && <li>• {formErrors.images}</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                Fields marked with * are required
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateBanner}
                  disabled={isSubmitDisabled()}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex items-center ${
                    isSubmitDisabled() 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                  title={isSubmitDisabled() ? "Please fill all required fields" : "Update banner"}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      {getSubmitButtonText()}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

            {/* Image Preview Modal */}
      {showImagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]">
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={closeImagePreview}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>
            
            {/* Current Image */}
            <div className="w-full h-full flex items-center justify-center">
              <img
                src={previewImageIndex < existingImages.length ? 
                  existingImages[previewImageIndex] : 
                  imagePreviews[previewImageIndex - existingImages.length]}
                alt={`Preview ${previewImageIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Found';
                }}
              />
            </div>
            
            {/* Image Counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-4 py-2 rounded-full text-sm">
              1 / {Math.max(existingImages.length, selectedImages.length, 1)}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BannerList;
