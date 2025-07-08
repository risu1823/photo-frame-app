document.addEventListener('DOMContentLoaded', () => {
    class PhotoFrameApp {
        constructor() {
            this.ui = {
                photoFrame: document.getElementById('photoFrame'),
                photoArea: document.getElementById('photoArea'), 
                photoImg: document.getElementById('photoImg'),
                placeholder: document.getElementById('placeholder'),
                uploadArea: document.getElementById('uploadArea'),
                photoInput: document.getElementById('photoInput'),
                templateButtons: document.querySelectorAll('#templateButtonGroup .btn'),
                aspectButtons: document.querySelectorAll('#aspectButtonGroup .btn'),
                colorControlItem: document.getElementById('colorControlItem'),
                colorButtons: document.querySelectorAll('#colorButtonGroup .btn'),
                downloadScreenBtn: document.getElementById('downloadScreenBtn'),
                downloadPrintBtn: document.getElementById('downloadPrintBtn'),
            };

            this.inputs = {
                cameraInfo: document.getElementById('cameraInfo'),
                shootingDate: document.getElementById('shootingDate'),
                // location: document.getElementById('location'), // 撮影場所を削除
                shutterSpeed: document.getElementById('shutterSpeed'),
                aperture: document.getElementById('aperture'),
                iso: document.getElementById('iso'),
                focalLength: document.getElementById('focalLength'),
            };

            this.displays = {
                a: { 
                    camera: document.getElementById('display-a-camera'), 
                    shooting: document.getElementById('display-a-shooting'), 
                    date: document.getElementById('display-a-date'), 
                    // location: document.getElementById('display-a-location') // 撮影場所を削除
                },
                b: { 
                    camera: document.getElementById('display-b-camera'), 
                    shooting: document.getElementById('display-b-shooting') 
                },
                c: { 
                    shooting: document.getElementById('display-c-shooting') 
                },
            };

            this.originalImageSrc = null;
            // originalImageRatioは写真表示には使わず、EXIF解析時の参照用
            this.originalImageRatio = 3 / 2; 

            // 定数定義 (マジックナンバーの排除)
            this.ASPECT_RATIOS = {
                '3-2': 3/2,
                '4-3': 4/3,
                '16-9': 16/9,
                '1-1': 1/1,
                '21-9': 21/9
            };
            this.PRINT_SETTINGS = {
                targetWidth: 3840, // 4Kの横幅に設定
                printResolution: 300, // dpi
                maxFileSize: 60 * 1024 * 1024, // 60MB
                jpegQuality: 0.8 // JPEG圧縮品質
            };
            // 情報帯の高さ比率（写真エリアの高さに対する比率）
            this.INFO_BAR_RATIO_NORMAL = 1 / 4; // 1/4 (写真エリアの高さの1/4)
            this.INFO_BAR_RATIO_C = 0.4; // Template Cは固定

            this.initialize();
        }

        initialize() {
            this.setupEventListeners();
            this.setDefaultSettings();
        }

        setupEventListeners() {
            // アップロード関連
            this.ui.uploadArea.addEventListener('click', () => this.ui.photoInput.click());
            this.setupDragAndDrop();
            this.ui.photoInput.addEventListener('change', (e) => this.handleFileInput(e));

            // コントロールボタン関連
            this.ui.templateButtons.forEach(btn => 
                btn.addEventListener('click', (e) => this.handleTemplateChange(e))
            );
            this.ui.aspectButtons.forEach(btn => 
                btn.addEventListener('click', (e) => this.handleAspectChange(e))
            );
            this.ui.colorButtons.forEach(btn => 
                btn.addEventListener('click', (e) => this.handleColorChange(e))
            );

            // ダウンロードボタン関連
            this.ui.downloadScreenBtn.addEventListener('click', () => this.handleDownload('screen'));
            this.ui.downloadPrintBtn.addEventListener('click', () => this.handleDownload('print'));

            // メタデータ入力欄関連
            // locationを削除したため、inputsからfilterする
            Object.values(this.inputs).filter(input => input !== this.inputs.location).forEach(input => 
                input.addEventListener('input', () => this.updateMetadata())
            );
        }

        setupDragAndDrop() {
            ['dragover', 'dragleave', 'drop'].forEach(eventName => 
                this.ui.uploadArea.addEventListener(eventName, (e) => e.preventDefault())
            );

            this.ui.uploadArea.addEventListener('dragover', () => 
                this.ui.uploadArea.classList.add('dragover')
            );
            this.ui.uploadArea.addEventListener('dragleave', () => 
                this.ui.uploadArea.classList.remove('dragover')
            );
            this.ui.uploadArea.addEventListener('drop', (e) => {
                this.ui.uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        handleFileInput(e) {
            if (e.target.files.length) {
                this.handleFile(e.target.files[0]);
            }
        }

        // ファイルのバリデーション
        validateFile(file) {
            if (!file.type.startsWith('image/')) {
                throw new Error('画像ファイルを選択してください。');
            }
            if (file.size > this.PRINT_SETTINGS.maxFileSize) {
                throw new Error(`ファイルサイズが大きすぎます。${this.PRINT_SETTINGS.maxFileSize / (1024 * 1024)}MB以下のファイルを選択してください。`);
            }
            return true;
        }

        async handleFile(file) {
            try {
                this.validateFile(file);
                
                const imageData = await this.loadImage(file);
                this.originalImageSrc = imageData.src;
                // this.currentImageOriginalRatio = imageData.ratio; // 写真の比率はUIには直接反映しない

                this.displayImage(imageData.src);
                await this.processExifData(file);
                this.applyTemplateAndAspect(); // 画像読み込み後にテンプレートとアスペクト比を再適用
                
            } catch (error) {
                console.error('ファイル処理エラー:', error);
                alert(error.message || 'ファイルの処理に失敗しました。');
            }
        }

        loadImage(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        resolve({
                            src: e.target.result,
                            ratio: img.width / img.height
                        });
                    };
                    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
                reader.readAsDataURL(file);
            });
        }

        displayImage(src) {
            this.ui.photoImg.src = src;
            this.ui.photoImg.style.display = 'block';
            this.ui.placeholder.style.display = 'none';
        }

        async processExifData(file) {
            return new Promise((resolve) => {
                EXIF.getData(file, () => {
                    try {
                        const exif = EXIF.getAllTags(file);
                        this.extractExifData(exif);
                        this.updateMetadata();
                    } catch (error) {
                        console.warn('EXIF データの処理に失敗（データが存在しないか不正な可能性があります）。', error);
                        // EXIF読み込み失敗時は入力欄をクリア
                        Object.values(this.inputs).forEach(input => input.value = '');
                        this.updateMetadata();
                    }
                    resolve();
                });
            });
        }

        extractExifData(exif) {
            // カメラ情報の安全な取得 (XSS対策としてサニタイズ)
            const make = this.sanitizeString(exif.Make || '');
            const model = this.sanitizeString(exif.Model || '');
            this.inputs.cameraInfo.value = `${make} ${model}`.trim();

            // 撮影日時の処理 (YYYY-MM-DDTHH:MM 形式に変換)
            if (exif.DateTimeOriginal) {
                try {
                    const [datePart, timePart] = exif.DateTimeOriginal.split(' ');
                    if (datePart && timePart) {
                        this.inputs.shootingDate.value = `${datePart.replace(/:/g, '-') || ''}T${timePart || ''}`;
                    } else {
                        this.inputs.shootingDate.value = ''; // 不正なフォーマットは空に
                    }
                } catch (error) {
                    console.warn('EXIF撮影日時の解析に失敗。', error);
                    this.inputs.shootingDate.value = '';
                }
            } else {
                 this.inputs.shootingDate.value = ''; // EXIF情報がない場合も空に
            }

            // 撮影設定の処理
            this.inputs.shutterSpeed.value = this.formatShutterSpeed(exif.ExposureTime);
            this.inputs.aperture.value = this.formatAperture(exif.FNumber);
            this.inputs.iso.value = this.formatISO(exif.ISOSpeedRatings);
            this.inputs.focalLength.value = this.formatFocalLength(exif.FocalLength);
            
            // locationを削除
            // this.inputs.location.value = ''; 
        }

        sanitizeString(str) {
            // HTMLエンティティに変換することでXSSを防ぐ
            const div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }

        formatShutterSpeed(exposureTime) {
            if (exposureTime === undefined || exposureTime === null) return '';
            // 露出時間が分数形式（例: 1/125）で格納されている場合があるので、その対応
            if (typeof exposureTime === 'number') {
                return exposureTime >= 1 ? `${exposureTime}s` : `1/${Math.round(1 / exposureTime)}s`;
            } else if (typeof exposureTime === 'object' && 'numerator' in exposureTime && 'denominator' in exposureTime) {
                // EXIF-JSはRationalオブジェクトとして返すことがある
                const value = exposureTime.numerator / exposureTime.denominator;
                return value >= 1 ? `${value}s` : `1/${Math.round(1 / value)}s`;
            }
            return '';
        }

        formatAperture(fNumber) {
            if (fNumber === undefined || fNumber === null) return '';
            if (typeof fNumber === 'number') return `f/${fNumber.toFixed(1)}`;
            if (typeof fNumber === 'object' && 'numerator' in fNumber && 'denominator' in fNumber) {
                return `f/${(fNumber.numerator / fNumber.denominator).toFixed(1)}`;
            }
            return '';
        }

        formatISO(isoValue) {
            return isoValue ? `ISO${isoValue}` : '';
        }

        formatFocalLength(focalLength) {
            if (focalLength === undefined || focalLength === null) return '';
            if (typeof focalLength === 'number') return `${focalLength}mm`;
            if (typeof focalLength === 'object' && 'numerator' in focalLength && 'denominator' in focalLength) {
                return `${(focalLength.numerator / focalLength.denominator).toFixed(0)}mm`; // 整数で表示
            }
            return '';
        }

        // テンプレートとアスペクト比の適用ロジック
        applyTemplateAndAspect() {
            const activeTemplateButton = document.querySelector('#templateButtonGroup .btn.active');
            const activeTemplate = activeTemplateButton ? activeTemplateButton.dataset.frame-template : 'template-a'; // Default
            
            const activeColorButton = document.querySelector('#colorButtonGroup .btn.active');
            const activeColor = activeColorButton ? activeColorButton.dataset.frame-color : 'black'; // Default

            // photoFrameのクラスをリセットして再適用
            this.ui.photoFrame.className = 'photo-frame'; // Reset all classes
            this.ui.photoFrame.classList.add(activeTemplate, `${activeColor}-frame`);

            const isTemplateC = (activeTemplate === 'template-c');
            
            // アスペクト比ボタンの有効/無効切り替え (テンプレートCのみ無効)
            this.ui.aspectButtons.forEach(b => b.classList.toggle('disabled', isTemplateC));
            // フレームカラーボタンは常に有効（どのテンプレートでも色変更可能になったため）
            this.ui.colorControlItem.classList.remove('disabled');

            // アスペクト比の適用
            // 選択されたアスペクト比ボタンのdata-aspect値を使用
            const selectedAspectButton = document.querySelector('#aspectButtonGroup .btn.active');
            let targetAspectRatio = this.ASPECT_RATIOS['3-2']; // デフォルト値
            if (selectedAspectButton) {
                targetAspectRatio = this.ASPECT_RATIOS[selectedAspectButton.dataset.aspect];
            }
            
            if (isTemplateC) {
                targetAspectRatio = this.ASPECT_RATIOS['1-1']; // テンプレートCは正方形に固定
                // 1:1ボタンをアクティブにし、他を非アクティブに (UI表示のみ)
                this.ui.aspectButtons.forEach(b => {
                    if (b.dataset.aspect === '1-1') {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            } else {
                 // テンプレートC以外では、現在アクティブなアスペクト比ボタンをUIに反映
                 this.autoSelectAspectRatioButton(targetAspectRatio); // 現在選択されているアスペクト比をアクティブにする
            }

            // photo-area にアスペクト比を適用
            this.ui.photoArea.style.aspectRatio = targetAspectRatio;
            
            // CSS変数 --current-photo-height の更新 (情報帯の高さ計算用)
            // photoAreaの現在の横幅とaspectRatioから高さを計算してCSS変数にセット
            const currentPhotoAreaWidth = this.ui.photoArea.clientWidth; // 実測値を取得
            const calculatedPhotoHeight = currentPhotoAreaWidth / targetAspectRatio;
            this.ui.photoFrame.style.setProperty('--current-photo-height', `${calculatedPhotoHeight}px`);

            this.updateMetadata();
        }

        // アスペクト比ボタンのアクティブ状態を更新する関数 (自動選択ではなく、指定された比率をアクティブにする)
        autoSelectAspectRatioButton(ratio) {
             this.ui.aspectButtons.forEach(b => {
                const btnRatio = this.ASPECT_RATIOS[b.dataset.aspect];
                // 厳密な比較ではなく、誤差を許容する比較
                if (Math.abs(btnRatio - ratio) < 0.001) { 
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
             });
        }


        // イベントハンドラー：テンプレート変更
        handleTemplateChange(e) {
            this.ui.templateButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            this.applyTemplateAndAspect(); // テンプレート変更時にアスペクト比も再適用
        }

        // イベントハンドラー：アスペクト比変更
        handleAspectChange(e) {
            const btn = e.currentTarget;
            if (btn.classList.contains('disabled')) return; // テンプレートCで無効化されている場合は何もしない
            
            this.ui.aspectButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.applyTemplateAndAspect(); // 新しいアスペクト比を適用
        }

        // イベントハンドラー：フレームカラー変更
        handleColorChange(e) {
            this.ui.colorButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const color = e.currentTarget.dataset.frameColor;
            this.ui.photoFrame.classList.remove('black-frame', 'white-frame');
            this.ui.photoFrame.classList.add(`${color}-frame`);
            // 写真エリアと情報帯の背景色をフレームカラーと同期
            this.ui.photoArea.style.backgroundColor = color === 'black' ? '#111' : '#fff';
            this.ui.photoFrame.querySelector('.info-panel-wrapper').style.backgroundColor = color === 'black' ? '#111' : '#fff';
        }

        // メタデータ表示の更新
        updateMetadata() {
            const data = this.collectMetadata();
            // 各表示要素にデータを設定（空の場合はデフォルト値を表示）
            this.displays.a.camera.textContent = data.camera || 'カメラ機種';
            this.displays.a.shooting.textContent = data.shooting || '撮影データ';
            this.displays.a.date.textContent = data.date ? data.date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '撮影日時';
            // this.displays.a.location.textContent = data.location || '撮影場所'; // locationを削除

            this.displays.b.camera.textContent = data.camera || 'カメラ機種';
            this.displays.b.shooting.textContent = data.shooting || '撮影データ';

            this.displays.c.shooting.textContent = data.shooting || '撮影データ';
        }

        // メタデータ入力値の収集
        collectMetadata() {
            return {
                camera: this.inputs.cameraInfo.value,
                date: this.inputs.shootingDate.value ? new Date(this.inputs.shootingDate.value) : null,
                // location: this.inputs.location.value, // locationを削除
                shooting: [this.inputs.focalLength.value, this.inputs.aperture.value, this.inputs.shutterSpeed.value, this.inputs.iso.value].filter(Boolean).join(' '),
            };
        }

        // ダウンロード処理
        async handleDownload(type) {
            if (!this.originalImageSrc) { alert('先に写真をアップロードしてください。'); return; }
            const btn = type === 'screen' ? this.ui.downloadScreenBtn : this.ui.downloadPrintBtn;
            const originalText = btn.textContent;
            btn.textContent = '生成中...'; btn.disabled = true;
            try {
                let canvas;
                if (type === 'screen') {
                    canvas = await this.createScreenCanvas();
                } else {
                    canvas = await this.createPrintCanvas();
                }
                this.downloadCanvas(canvas, `photo_frame_${type}.${type === 'screen' ? 'png' : 'jpg'}`, type);
            } catch (error) { console.error(`${type}用画像の生成に失敗:`, error); alert('画像の生成に失敗しました。');
            } finally { btn.textContent = originalText; btn.disabled = false; }
        }

        // スクリーン用Canvasの作成
        async createScreenCanvas() {
            return await html2canvas(this.ui.photoFrame, { useCORS: true, scale: 2, backgroundColor: null });
        }

        // Canvasをファイルとしてダウンロード
        downloadCanvas(canvas, filename, type) {
            const link = document.createElement('a');
            link.download = filename;
            const mimeType = type === 'screen' ? 'image/png' : 'image/jpeg';
            const quality = type === 'screen' ? 1.0 : this.PRINT_SETTINGS.jpegQuality; // 印刷用はJPEG品質を適用
            link.href = canvas.toDataURL(mimeType, quality);
            link.click();
        }

        // 印刷用高画質Canvasの作成
        async createPrintCanvas() {
            const settings = this.getPrintSettings();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Canvas全体のサイズ設定
            const targetWidth = this.PRINT_SETTINGS.targetWidth; // 基準となる幅 (4K横幅)
            let photoHeight = targetWidth / settings.aspectRatio; // 写真エリアの高さ
            let infoHeight = 0; // 情報帯の高さ

            // 情報帯の高さを調整
            if (settings.template === 'template-a' || settings.template === 'template-b') {
                infoHeight = photoHeight * this.INFO_BAR_RATIO_NORMAL; // 写真エリアの1/4
            } else if (settings.template === 'template-c') {
                // Template C は写真部分が正方形、情報帯も大きめに固定
                photoHeight = targetWidth; // Template Cでは写真エリア自体が正方形になるように幅と同じ高さに
                infoHeight = targetWidth * this.INFO_BAR_RATIO_C; // 情報帯は全体の幅の40%
            }

            canvas.width = targetWidth;
            canvas.height = photoHeight + infoHeight;

            const img = await this.loadImageForPrint(this.originalImageSrc);
            
            // フレームの背景色の描画 (写真エリアと情報帯の共通背景)
            ctx.fillStyle = settings.isBlack ? '#111' : '#fff'; // フレームカラー
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 写真エリアの座標とサイズ
            const pArea = { x: 0, y: 0, w: targetWidth, h: photoHeight };
            if (settings.template === 'template-c') { // Template Cは写真が中央に配置される
                 pArea.w = targetWidth * 0.9; pArea.h = pArea.w; // 写真エリアをフレームの90%に縮小
                 pArea.x = (targetWidth - pArea.w) / 2; pArea.y = pArea.x; // 中央に配置
            }
            
            // 写真の描画（背景色でfill、containモード）
            // photo-areaの背景色（余白の色）と同じにする
            ctx.fillStyle = settings.isBlack ? '#111' : '#fff'; 
            ctx.fillRect(pArea.x, pArea.y, pArea.w, pArea.h);
            this.drawImageFit(ctx, img, pArea); // imgをpAreaにcontainで描画
            
            // 情報帯の描画
            // y座標は写真エリアの直下から
            const iArea = { x: 0, y: pArea.y + pArea.h, w: canvas.width, h: infoHeight, p: targetWidth * 0.04 }; // p: padding
            // ctx.fillStyleはdrawTemplateInfo内で設定される
            const baseFont = targetWidth * 0.022; // 印刷用の基本フォントサイズ
            
            this.drawTemplateInfo(ctx, settings, iArea, baseFont); // 各テンプレートごとの情報描画
            return canvas;
        }

        // 印刷用Canvas設定の取得
        getPrintSettings() {
            const activeTemplateButton = document.querySelector('#templateButtonGroup .btn.active');
            const currentTemplate = activeTemplateButton ? activeTemplateButton.dataset.frameTemplate : 'template-a';

            // 現在アクティブなアスペクト比ボタンのdata-aspect値から比率を取得
            const activeAspectButton = document.querySelector('#aspectButtonGroup .btn.active');
            let currentAspectRatio = this.ASPECT_RATIOS['3-2']; // デフォルト値
            if (activeAspectButton && !activeAspectButton.classList.contains('disabled')) {
                currentAspectRatio = this.ASPECT_RATIOS[activeAspectButton.dataset.aspect];
            } else if (currentTemplate === 'template-c') {
                currentAspectRatio = this.ASPECT_RATIOS['1-1']; // テンプレートCは常に1:1
            }
            
            const isBlackFrame = this.ui.photoFrame.classList.contains('black-frame');

            return {
                template: currentTemplate,
                aspectRatio: currentAspectRatio,
                isBlack: isBlackFrame,
                data: this.collectMetadata()
            };
        }

        // 印刷用画像ロード（Promiseでラップ）
        loadImageForPrint(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error('印刷用画像の読み込みに失敗しました。'));
                img.src = src;
            });
        }

        // Canvasに画像をfitで描画 (object-fit: contain と同じ挙動)
        drawImageFit(ctx, img, area) {
            const imgRatio = img.width / img.height;
            const areaRatio = area.w / area.h;
            
            let dw, dh, dx, dy;
            
            if (imgRatio > areaRatio) { // 画像が横長の場合、幅に合わせて高さを調整
                dw = area.w;
                dh = dw / imgRatio;
                dx = area.x;
                dy = area.y + (area.h - dh) / 2; // 中央揃え
            } else { // 画像が縦長または同じ比率の場合、高さに合わせて幅を調整
                dh = area.h;
                dw = dh * imgRatio;
                dx = area.x + (area.w - dw) / 2; // 中央揃え
                dy = area.y;
            }
            
            ctx.drawImage(img, dx, dy, dw, dh);
        }

        // 各テンプレートごとの情報描画ロジック
        drawTemplateInfo(ctx, settings, iArea, baseFont) {
            // テキストのデフォルト色とアライメントを設定
            ctx.textAlign = 'left';
            ctx.fillStyle = settings.isBlack ? '#fff' : '#333';

            switch (settings.template) {
                case 'template-a':
                    // カメラ機種
                    ctx.font = `bold ${baseFont * 1.1}px sans-serif`;
                    ctx.fillText(settings.data.camera || 'カメラ機種', iArea.p, iArea.y + iArea.p * 1.2); 
                    
                    // 撮影データ
                    ctx.font = `${baseFont * 0.9}px sans-serif`;
                    ctx.fillText(settings.data.shooting || '撮影データ', iArea.p, iArea.y + iArea.p * 2.4); 
                    
                    // 撮影日時
                    if (settings.data.date) {
                        ctx.textAlign = 'right';
                        ctx.fillStyle = settings.isBlack ? '#ccc' : '#888';
                        ctx.fillText(settings.data.date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }), iArea.w - iArea.p, iArea.y + iArea.p * 2.4); 
                    }
                    ctx.textAlign = 'left'; // リセット
                    
                    // 撮影場所（削除）
                    // ctx.font = `italic ${baseFont * 0.8}px sans-serif`;
                    // ctx.fillStyle = settings.isBlack ? '#ccc' : '#888';
                    // ctx.fillText(settings.data.location || '撮影場所', iArea.p, iArea.y + iArea.p * 3.6); 
                    break;

                case 'template-b':
                    ctx.textAlign = 'right';
                    ctx.fillStyle = settings.isBlack ? '#fff' : '#333';
                    // カメラ機種
                    ctx.font = `bold ${baseFont * 1.1}px sans-serif`;
                    ctx.fillText(settings.data.camera || 'カメラ機種', iArea.w - iArea.p, iArea.y + iArea.h / 2 - baseFont * 0.6); 
                    
                    // 撮影データ
                    ctx.font = `${baseFont * 0.9}px sans-serif`;
                    ctx.fillStyle = settings.isBlack ? '#eee' : '#666';
                    ctx.fillText(settings.data.shooting || '撮影データ', iArea.w - iArea.p, iArea.y + iArea.h / 2 + baseFont * 0.8); 
                    break;

                case 'template-c':
                    ctx.textAlign = 'center';
                    // 撮影データ
                    ctx.font = `${baseFont * 0.9}px sans-serif`;
                    ctx.fillStyle = settings.isBlack ? '#eee' : '#555';
                    ctx.fillText(settings.data.shooting || '撮影データ', iArea.w / 2, iArea.y + iArea.h / 2); 
                    break;
            }
        }

        // アプリケーションの初期設定
        setDefaultSettings() {
            // 初期テンプレートとカラーを設定し、そのクリックイベントを発火
            document.querySelector('[data-frame-template="template-a"]').click();
            document.querySelector('[data-frame-color="black"]').click();
            // 初期アスペクト比を設定し、そのクリックイベントを発火
            document.querySelector('[data-aspect="3-2"]').click();
        }
    }

    // アプリケーションの初期化
    new PhotoFrameApp();
});
