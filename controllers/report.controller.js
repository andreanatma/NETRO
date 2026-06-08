'use strict';
const db = require('../models');
const { Log } = db;
const { Op } = require("sequelize");
const ExcelJS = require('exceljs');

exports.getLogs = async (req, res) => {
    const { month, site } = req.query;
    let whereCondition = {};

    if (site) {
        whereCondition.site = site;
    }
    if (month) { // Format month 'YYYY-MM'
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        whereCondition.createdAt = { [Op.gte]: startDate, [Op.lt]: endDate };
    }

    try {
        const logs = await Log.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: 200 // Batasi agar tidak terlalu berat
        });
        res.status(200).send(logs);
    } catch (error) {
        res.status(500).send({ message: "Gagal mengambil data log." });
    }
};

exports.exportLogsExcel = async (req, res) => {
    const { month, site } = req.query;
    let whereCondition = {};

    if (site) {
        whereCondition.site = site;
    }
    if (month) {
        const startDate = new Date(`${month}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        whereCondition.createdAt = { [Op.gte]: startDate, [Op.lt]: endDate };
    }

    try {
        const logs = await Log.findAll({ where: whereCondition, order: [['createdAt', 'DESC']] });
        const data = logs.map(log => log.toJSON());

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Activity Logs');
        
        sheet.columns = [
            { header: 'Waktu', key: 'createdAt', width: 25 },
            { header: 'Pengguna', key: 'user', width: 30 },
            { header: 'Site', key: 'site', width: 15 },
            { header: 'Aksi', key: 'action', width: 15 },
            { header: 'Modul', key: 'module', width: 15 },
            { header: 'Modul ID', key: 'moduleId', width: 15 },
            { header: 'Detail Perubahan', key: 'details', width: 100 },
        ];

        sheet.addRows(data);
        sheet.getRow(1).font = { bold: true };
        
        const fileName = `activity_log_${month || 'all'}_${site || 'all'}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        res.status(500).send({ message: "Gagal membuat laporan log." });
    }
};