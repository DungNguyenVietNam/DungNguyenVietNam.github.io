/**
 * Mảnh ghép nối tầng dữ liệu vào vỏ giao diện.
 *
 * khanhhoa.html là vỏ độc lập — nó KHÔNG tự gọi API, chỉ chờ được đăng ký một
 * bộ dựng lớp qua window.__pam.setForecastLayer(). File này là bên đăng ký đó.
 * Tách riêng như vậy để vỏ và tầng dữ liệu phát triển độc lập được, và để đổi
 * nguồn dữ liệu sau này chỉ phải sửa đúng một file.
 *
 * Nạp SAU khanhhoa.html, dạng <script type="module">.
 */
import { taiDuLieuKhanhHoa } from './khanhhoa-data.js';

import { addFieldLayer as leafletField } from './leaflet-adapter.js';
import { addFieldLayer as googleField } from './google-adapter.js';

const BIEN = 'precipitation_sum';   // lớp duy nhất hiện bật: mưa 24h

/** Chỉ số ngày đang xem. 1 = ngày mai, khớp nhãn "Dự báo mưa 24h". */
const NGAY = 1;

let luoi = null;      // giữ lại để bật/tắt lớp không phải gọi API lại

const pam = window.__pam;
if (!pam) {
  console.error('[tích hợp] Không thấy window.__pam — khanhhoa.html phải nạp trước file này.');
} else {
  pam.setForecastLayer(async (map, { engine }) => {
    // Tải một lần rồi dùng lại. khanhhoa-data.js còn cache localStorage 2 giờ
    // nên mở lại trang cũng không tốn thêm lượt gọi.
    if (!luoi) {
      pam.setStatus('Đang tải dự báo mưa từ Open-Meteo…');
      luoi = await taiDuLieuKhanhHoa({
        bien: [BIEN],
        onProgress: ({ nhan }) => nhan && pam.setStatus(nhan),
        // Báo cho người dùng biết vì sao phải chờ, thay vì để trang như treo.
        onCho: (giay) => pam.setStatus(
          `Đang chờ ${giay} giây cho đủ ngân sách gọi của Open-Meteo ` +
          `(mỗi điểm tính một lượt, trần 600 lượt/phút)…`),
      });
    }

    const mat = luoi.mangPhang(BIEN, NGAY);
    if (!mat) throw new Error(`Không có dữ liệu "${BIEN}" cho mốc ngày ${NGAY}.`);

    // Vỏ đã có sẵn 4 bậc mưa trong Chú giải, nên ở đây CHỈ thêm phần nguồn —
    // lặp lại thang màu lần nữa chỉ làm panel dài ra mà không thêm thông tin.
    // Ghi công CC-BY 4.0 là BẮT BUỘC theo giấy phép Open-Meteo, đừng bỏ.
    const luc = new Date(luoi.layLuc ?? Date.now()).toLocaleString('vi-VN');
    pam.setLegendExtra(
      `<div style="font-size:11.5px;line-height:1.5;color:#64748b;margin-top:8px;` +
      `padding-top:8px;border-top:1px solid #e2e8f0">` +
      `Dự báo ${luoi.times?.[NGAY] ?? ''} · lấy lúc ${luc}<br>` +
      `Số mô hình dự báo, không phải số đo trạm<br>` +
      `Nguồn: <a href="https://open-meteo.com/" target="_blank" rel="noopener"` +
      ` style="color:inherit">Open-Meteo</a> · CC-BY 4.0</div>`);

    const soDiem = luoi.lats.length * luoi.lons.length;
    pam.setStatus(
      `Dự báo mưa ${luoi.times?.[NGAY] ?? ''} · lưới ${luoi.lats.length}×${luoi.lons.length} ` +
      `(${soDiem} điểm)${luoi.tuCache ? ' · lấy từ cache' : ''} · nguồn Open-Meteo`);

    const them = engine === 'google' ? googleField : leafletField;
    // alpha 0.55: đủ rõ mà vẫn nhìn xuyên được nền vệ tinh
    return them(map, luoi, BIEN, mat, { alpha: 0.55 });
  });
}
