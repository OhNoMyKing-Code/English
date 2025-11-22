# Demo ứng dụng phát âm tiếng Anh (Web)

Mục tiêu: demo nhanh TTS + speech recognition để luyện phát âm.

Yêu cầu:
- Trình duyệt hiện đại (Chrome khuyến nghị vì hỗ trợ Web Speech API tốt).
- Không cần cài thêm, mở `index.html` trực tiếp.

Các file:
- `index.html` — giao diện
- `app.js` — logic TTS và nhận dạng, scoring đơn giản
- `styles.css` — CSS

Cách dùng:
1. Mở `index.html` trong Chrome.
2. Chọn câu mẫu hoặc nhập câu tiếng Anh.
3. Chọn giọng (nếu trình duyệt cung cấp).
4. Bấm "Phát âm" để nghe mẫu.
5. Bấm "Bắt đầu thu âm" và đọc theo. Khi dừng, hệ thống sẽ hiển thị transcript và điểm tương đồng.

Ghi chú & bước tiếp:
- MVP này dùng Web Speech API — phù hợp cho prototype. Để sản phẩm thương mại:
  - Dùng cloud TTS (Google/Amazon/Microsoft/Coqui) để có giọng tự nhiên hơn.
  - Dùng ASR chuyên dụng hoặc kết hợp với đánh giá phát âm (pronunciation scoring) bằng models (ESPnet, Kaldi, or cloud speech with word-level timestamps).
  - Thêm lesson, phonetic transcription (IPA), practice with feedback per-phoneme.
  - Thêm authentication, lưu tiến độ, đa nền tảng (React Native / Flutter) nếu cần.
- Nếu muốn mình có thể:
  - Chuyển demo này sang React/React Native/Flutter.
  - Thêm server để lưu bài tập, dùng cloud ASR/TTS.
  - Thiết kế flow bài học + database.

Liên hệ: trả lời tin nhắn này để mình triển khai tiếp theo nền tảng bạn muốn.
