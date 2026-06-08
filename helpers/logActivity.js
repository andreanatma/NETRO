'use strict';

const db = require('../models');
const { Log, User, Tempat } = db;

async function logActivity({ userId, action, module, moduleId, oldData = null, newData }) {
    try {
        const user = await User.findByPk(userId, { attributes: ['email'] });
        if (!user) return;

        let details = '';
        let site = newData.site || (oldData ? oldData.site : null) || null;
        const mainIdentifier = newData.kode_sfp || newData.kode_lpuf || newData.kode_card || newData.kode_tempat || `ID ${moduleId}`;
        const oldIdentifier = oldData ? (oldData.kode_sfp || oldData.kode_lpuf || oldData.kode_card || oldData.kode_tempat || `ID ${moduleId}`) : '';

        // Dapatkan site jika tidak ada secara langsung (misal dari SFP)
        if (!site) {
            const kodeTempat = newData.kode_tempat || (oldData ? oldData.kode_tempat : null);
            if (kodeTempat) {
                const tempat = await Tempat.findOne({ where: { kode_tempat: kodeTempat } });
                if (tempat) site = tempat.site;
            } else {
                site = (mainIdentifier || oldIdentifier).split('-')[0];
            }
        }

        // Buat detail log yang lebih ringkas
        if (action === 'CREATE') {
            details = `Menambahkan: '${mainIdentifier}'`;
        } else if (action === 'DELETE') {
            details = `Menghapus: '${oldIdentifier}'`;
        } else if (action === 'UPDATE') {
            const changes = [];
            for (const key in newData) {
                if (oldData && oldData.hasOwnProperty(key) && String(oldData[key]) !== String(newData[key])) {
                    changes.push(`'${key}' dari "${oldData[key]}" menjadi "${newData[key]}"`);
                }
            }
            details = changes.length > 0 ? `Perubahan pada '${mainIdentifier}': ${changes.join(', ')}.` : `Tidak ada perubahan field.`;
        }
        
        await Log.create({
            user: user.email, action, module, moduleId, details, site
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
}
module.exports = { logActivity };