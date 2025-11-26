import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Star, Trash2, Edit3 } from 'lucide-react';
import { serviceCategories as defaultServiceCategories } from '../../data/services';

function ServicesTab({ services, setServices, newCategory, setNewCategory, newService, setNewService, addNewCategory, deleteCategory, addServiceToCategory, deleteService, saveServices, openEditModal }) {
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);

    // Merge existing categories from services.js with any custom categories from Firestore
    const allCategories = { ...defaultServiceCategories, ...services };
    const existingCategories = Object.keys(allCategories);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Administrer Tjenester og Stjerner</h2>
                    <p className="text-gray-600 text-sm mt-1">Konfigurer tjenester og hvor mange stjerner de gir</p>
                </div>
                <button
                    onClick={saveServices}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                    <Save size={16} />
                    Lagre alle endringer
                </button>
            </div>

            {/* Add New Service Form */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                    <Plus size={18} />
                    Legg til ny tjeneste
                </h3>

                <div className="space-y-4">
                    {/* Category Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Velg kategori
                        </label>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => {
                                        if (e.target.value === 'new') {
                                            setShowNewCategoryForm(true);
                                            setSelectedCategory('');
                                        } else {
                                            setSelectedCategory(e.target.value);
                                            setShowNewCategoryForm(false);
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Velg eksisterende kategori...</option>
                                    {existingCategories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                    <option value="new">+ Opprett ny kategori</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* New Category Input */}
                    {showNewCategoryForm && (
                        <div className="p-4 bg-white border border-blue-200 rounded-lg">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Navn på ny kategori
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder="f.eks. 'Mobilabonnement', 'Forsikring', 'Lån'"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button
                                    onClick={() => {
                                        addNewCategory();
                                        setSelectedCategory(newCategory);
                                        setShowNewCategoryForm(false);
                                    }}
                                    disabled={!newCategory.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Opprett
                                </button>
                                <button
                                    onClick={() => {
                                        setShowNewCategoryForm(false);
                                        setNewCategory('');
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Avbryt
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Service Details Form */}
                    {(selectedCategory || showNewCategoryForm) && (
                        <div className="space-y-4 p-4 bg-white border border-blue-200 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tjenestenavn *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={selectedCategory === 'Forsikring' ? "f.eks. 'Bilforsikring' (valgfritt hvis du bruker beløpsområde)" : "f.eks. 'Mobilabonnement 500GB'"}
                                        value={newService.name}
                                        onChange={(e) => setNewService({...newService, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Antall stjerner *
                                        <span className="text-xs text-gray-500 block">Hvor mange stjerner gir dette salget?</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="1"
                                            min="1"
                                            max="100"
                                            value={newService.stars}
                                            onChange={(e) => setNewService({...newService, stars: e.target.value})}
                                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <Star className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500" size={16} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Salg-multiplier
                                        <span className="text-xs text-gray-500 block">Hvor mange salg trengs for å få stjernene?</span>
                                    </label>
                                    <select
                                        value={newService.multiplier}
                                        onChange={(e) => setNewService({...newService, multiplier: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value={1}>1 salg = stjerner (standard)</option>
                                        <option value={2}>2 salg = stjerner (x2)</option>
                                        <option value={3}>3 salg = stjerner (x3)</option>
                                        <option value={4}>4 salg = stjerner (x4)</option>
                                        <option value={5}>5 salg = stjerner (x5)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Insurance Amount Range */}
                            {selectedCategory === 'Forsikring' && (
                                <div className="border-t border-gray-200 pt-4">
                                    <h4 className="font-medium text-gray-700 mb-3">Beløpsområde (valgfritt)</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Fra beløp (kr)
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="f.eks. 500"
                                                min="0"
                                                value={newService.startAmount}
                                                onChange={(e) => setNewService({...newService, startAmount: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Til beløp (kr)
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="f.eks. 999"
                                                min="0"
                                                value={newService.endAmount}
                                                onChange={(e) => setNewService({...newService, endAmount: e.target.value})}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Hvis du spesifiserer beløpsområde, vil tjenesten automatisk få navn som "500-999kr"
                                    </p>
                                </div>
                            )}

                            {/* Insurance Recurring Option */}
                            {selectedCategory === 'Forsikring' && (
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            id="isRecurring"
                                            checked={newService.isRecurring}
                                            onChange={(e) => setNewService({...newService, isRecurring: e.target.checked})}
                                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <label htmlFor="isRecurring" className="font-medium text-gray-700">
                                                Abonnement/Kontinuerlig forsikring
                                            </label>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Markér dette hvis forsikringen er et månedlig abonnement. Stjerner gis kun én gang ved første salg, ikke hver måned.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add Service Button */}
                    {selectedCategory && newService.stars && (
                        // For Forsikring: either name OR amount range is required
                        (selectedCategory !== 'Forsikring' && newService.name.trim()) ||
                        (selectedCategory === 'Forsikring' && (newService.name.trim() || (newService.startAmount && newService.endAmount)))
                    ) && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    addServiceToCategory(selectedCategory);
                                    setNewService({ name: '', stars: '', multiplier: 1, isRecurring: false, startAmount: '', endAmount: '' });
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Plus size={16} />
                                Legg til tjeneste
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Existing Categories and Services */}
            <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Eksisterende tjenester</h3>

                {existingCategories.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Star size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen tjenester ennå</h3>
                        <p className="text-gray-600">Legg til din første tjeneste ovenfor for å komme i gang!</p>
                    </div>
                ) : (
                    Object.entries(allCategories).map(([categoryName, categoryServices]) => (
                        <div key={categoryName} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 text-lg">
                                    {categoryName}
                                    {defaultServiceCategories[categoryName] && (
                                        <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                            Standard
                                        </span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">
                                        {Object.keys(categoryServices).length} tjeneste{Object.keys(categoryServices).length !== 1 ? 'r' : ''}
                                    </span>
                                    <button
                                        onClick={() => deleteCategory(categoryName)}
                                        className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Slett kategori"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                {Object.keys(categoryServices).length === 0 ? (
                                    <p className="text-gray-500 italic">Ingen tjenester i denne kategorien ennå</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(categoryServices).map(([serviceName, serviceData]) => {
                                            // Handle both old format (just stars) and new format (object with stars and multiplier)
                                            const stars = typeof serviceData === 'object' ? serviceData.stars : serviceData;
                                            const multiplier = typeof serviceData === 'object' ? serviceData.multiplier || 1 : 1;
                                            const isRecurring = typeof serviceData === 'object' ? serviceData.isRecurring || false : false;

                                            // Check if service name includes multiplier info (like "x2", "x3") at the end
                                            const multiplierMatch = serviceName.match(/ x(\d+)$/);
                                            const hasMultiplierInName = multiplierMatch !== null;
                                            const displayMultiplier = hasMultiplierInName ?
                                                parseInt(multiplierMatch[1] || '1') : multiplier;

                                            return (
                                                <div key={serviceName} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-gray-900 mb-2">{serviceName}</h4>
                                                            <div className="flex items-center gap-2 text-sm flex-wrap">
                                                                <div className="flex items-center gap-1 text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                                                                    <Star size={14} fill="currentColor" />
                                                                    <span className="font-semibold">{stars} stjerne{stars !== 1 ? 'r' : ''}</span>
                                                                </div>
                                                                {displayMultiplier > 1 && (
                                                                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                                                        <span className="font-semibold">x{displayMultiplier}</span>
                                                                        <span className="text-xs">salg</span>
                                                                    </div>
                                                                )}
                                                                {categoryName === 'Forsikring' && (
                                                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                                                                        isRecurring 
                                                                        ? 'text-purple-600 bg-purple-50' 
                                                                        : 'text-green-600 bg-green-50'
                                                                    }`}>
                                                                        <span className="text-xs font-semibold">
                                                                            {isRecurring ? 'Abonnement' : 'Engangs'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => openEditModal(categoryName, serviceName, serviceData)}
                                                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                                                title="Rediger tjeneste"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteService(categoryName, serviceName)}
                                                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                                                title="Slett tjeneste"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {displayMultiplier > 1 && (
                                                        <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded mb-2">
                                                            Krever {displayMultiplier} salg for å få {stars} stjerne{stars !== 1 ? 'r' : ''}
                                                        </div>
                                                    )}
                                                    {isRecurring && (
                                                        <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                                                            🔄 Abonnement - Stjerner gis kun ved første salg
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </motion.div>
    );
}

export default ServicesTab;
