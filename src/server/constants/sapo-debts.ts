/**
 * Dữ liệu chuẩn công nợ Sapo Live (Trang Quản lý công nợ Nhà Cung Cấp)
 * Nguồn: https://cua-hang-yen-sen.mysapo.net/admin/apps/debt-management/suppliers
 */

export interface SapoSupplierDebtRecord {
  no_dau_ky: number;
  no_tang_trong_ky: number;
  no_giam_trong_ky: number;
  phai_thu_tra_cuoi_ky: number;
  code?: string;
}

export const SAPO_OFFICIAL_SUPPLIER_SUMMARY = {
  no_dau_ky: -727416666,
  no_giam_trong_ky: 969365606,
  no_tang_trong_ky: 519696740,
  no_cuoi_ky: -277747800,
};

export const SAPO_SUPPLIER_OFFICIAL_DEBTS: Record<number, SapoSupplierDebtRecord> = {
  80121: {
    // GNEST
    no_dau_ky: -633267026,
    no_tang_trong_ky: -473994964,
    no_giam_trong_ky: 874325026,
    phai_thu_tra_cuoi_ky: -232936964,
    code: "CNEST - 01",
  },
  269195: {
    // VIETTEL
    no_dau_ky: 0,
    no_tang_trong_ky: -30641236,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -30641236,
    code: "VIETTEL",
  },
  154489: {
    // ÁNH NÉT VIỆT
    no_dau_ky: 890940,
    no_tang_trong_ky: -6290940,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -5400000,
    code: "SUP00010",
  },
  96216: {
    // Ecco
    no_dau_ky: 0,
    no_tang_trong_ky: -4200000,
    no_giam_trong_ky: 0,
    phai_thu_tra_cuoi_ky: -4200000,
    code: "SUP00001",
  },
  182129: {
    // THỦY TINH VIỆT
    no_dau_ky: -7646400,
    no_tang_trong_ky: -3369600,
    no_giam_trong_ky: 7646400,
    phai_thu_tra_cuoi_ky: -3369600,
    code: "SUP00014",
  },
  189367: {
    // TRƯỜNG THỦY 1
    no_dau_ky: -40800000,
    no_tang_trong_ky: -1200000,
    no_giam_trong_ky: 40800000,
    phai_thu_tra_cuoi_ky: -1200000,
    code: "SUP00015",
  },
};
