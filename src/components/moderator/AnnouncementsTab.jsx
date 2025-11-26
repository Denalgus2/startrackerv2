import { motion } from 'framer-motion';
import { Megaphone, Trash2 } from 'lucide-react';

function AnnouncementsTab({ announcements, newAnnouncement, setNewAnnouncement, addAnnouncement, deleteAnnouncement }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <h2 className="text-xl font-semibold text-gray-900">Administrer Kunngjøringer</h2>

            {/* Add New Announcement */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-4">Ny kunngjøring</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Tittel på kunngjøring"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <textarea
                        placeholder="Melding..."
                        value={newAnnouncement.message}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                    <div className="flex items-center gap-4">
                        <select
                            value={newAnnouncement.type}
                            onChange={(e) => setNewAnnouncement({...newAnnouncement, type: e.target.value})}
                            className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="info">Info (Blå)</option>
                            <option value="success">Suksess (Grønn)</option>
                            <option value="warning">Advarsel (Gul)</option>
                            <option value="error">Viktig (Rød)</option>
                        </select>
                        <button
                            onClick={addAnnouncement}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Megaphone size={16} />
                            Publiser kunngjøring
                        </button>
                    </div>
                </div>
            </div>

            {/* Existing Announcements */}
            <div className="space-y-4">
                {announcements.map((announcement) => (
                    <div key={announcement.id} className={`p-4 rounded-lg border-2 ${
                        announcement.type === 'success' ? 'bg-green-50 border-green-200' :
                        announcement.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        announcement.type === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-blue-50 border-blue-200'
                    }`}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{announcement.title}</h4>
                                <p className="text-gray-700 mt-1">{announcement.message}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {announcement.createdAt?.toDate().toLocaleDateString('no-NO')} av {announcement.createdBy}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteAnnouncement(announcement.id)}
                                className="text-red-600 hover:text-red-800 p-1 ml-4"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}

                {announcements.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <Megaphone size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Ingen kunngjøringer ennå. Legg til din første kunngjøring ovenfor!</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

export default AnnouncementsTab;
