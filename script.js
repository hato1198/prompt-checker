document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const resultArea = document.getElementById('result-area');
    const previewImage = document.getElementById('preview-image');
    const promptTextarea = document.getElementById('prompt');
    const negativePromptTextarea = document.getElementById('negative-prompt');
    const otherInfoTextarea = document.getElementById('other-info');
    const stepsInput = document.getElementById('steps');
    const samplerInput = document.getElementById('sampler');
    const cfgScaleInput = document.getElementById('cfg-scale');
    const seedInput = document.getElementById('seed');
    const sizeInput = document.getElementById('size');
    const clipSkipInput = document.getElementById('clip-skip');
    const modelInput = document.getElementById('model');
    const copyBtns = document.querySelectorAll('.copy-btn');
    const resetBtn = document.getElementById('reset-btn');
    const errorMessage = document.getElementById('error-message');

    // --- イベントリスナー設定 ---

    // ファイル選択ボタン
    fileSelectBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // ドラッグ＆ドロップ
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    // コピーボタン
    copyBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const element = document.getElementById(targetId);
            navigator.clipboard.writeText(element.value).then(() => {
                showCopiedFeedback(btn);
            }).catch(err => {
                console.error('コピーに失敗しました', err);
            });
        });
    });

    // リセットボタン
    resetBtn.addEventListener('click', resetUI);

    // --- 関数定義 ---

    /**
     * ファイルを処理する
     * @param {File} file 
     */
    function handleFile(file) {
        if (file.type.match('image/jpeg')) {
            handleJpegFile(file);
        } else if (file.type.match('image/png')) {
            handlePngFile(file);
        } else {
            alert('JPEGまたはPNG画像を選択してください。');
            return;
        }
    }

    /**
     * JPEGファイルを処理する
     * @param {File} file 
     */
    function handleJpegFile(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            previewImage.src = imageDataUrl;
            
            try {
                const exifData = piexif.load(imageDataUrl);
                const userComment = exifData.Exif[piexif.ExifIFD.UserComment];

                if (userComment) {
                    // UserCommentは通常、最初の8バイトが文字コード指定（例: "UNICODE\0"）、残りがデータ
                    const decodedComment = decodeUserComment(userComment);
                    parseAndDisplayMetadata(decodedComment);
                    showResultArea();
                } else {
                    showError();
                }
            } catch (error) {
                console.error('メタデータの読み取りに失敗しました:', error);
                showError();
            }
        };

        reader.readAsDataURL(file);
    }

    /**
     * PNGファイルを処理する
     * @param {File} file 
     */
    async function handlePngFile(file) {
        const reader = new FileReader();

        reader.onload = async (e) => {
            const imageDataUrl = e.target.result;
            previewImage.src = imageDataUrl;

            try {
                const tags = await ExifReader.load(file);
                console.log(tags);

                // Stable Diffusion a1111
                if (tags.parameters) {
                    parseAndDisplayMetadata(tags.parameters.description);
                    showResultArea();
                // NovelAI
                } else if (tags.Description) {
                    parseAndDisplayMetadata(tags.Description.description);
                    showResultArea();
                } else {
                    showError();
                }
            } catch (error) {
                console.error('メタデータの読み取りに失敗しました:', error);
                showError();
            }
        };

        reader.readAsDataURL(file);
    }

    /**
     * piexifから取得したUserCommentをデコードする
     * @param {string} comment 
     * @returns {string}
     */
    function decodeUserComment(comment) {
        // 最初の8バイト (ASCII, JIS, UNICODEなど) をスキップしてデコード
        // 多くの場合、文字コードに関わらずUTF-8でデコードすれば読める
        try {
            const bytes = new Uint8Array(comment.length - 8);
            for (let i = 8; i < comment.length; i++) {
                bytes[i - 8] = comment.charCodeAt(i);
            }
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            // デコード失敗時はそのまま返す
            return comment;
        }
    }


    /**
     * メタデータを解析して表示する
     * @param {string} metadataString 
     */
    function parseAndDisplayMetadata(metadataString) {
        const cleanedString = metadataString.replace(/\0/g, '').trim();

        let prompt = '';
        let negativePrompt = '';
        let otherInfo = '';

        const negPromptIndex = cleanedString.indexOf('Negative prompt:');
        const paramsIndex = cleanedString.indexOf('Steps:');

        if (negPromptIndex !== -1) {
            prompt = cleanedString.substring(0, negPromptIndex).trim();
            if (paramsIndex !== -1) {
                negativePrompt = cleanedString.substring(negPromptIndex + 'Negative prompt:'.length, paramsIndex).trim();
                otherInfo = cleanedString.substring(paramsIndex).trim();
            } else {
                negativePrompt = cleanedString.substring(negPromptIndex + 'Negative prompt:'.length).trim();
            }
        } else if (paramsIndex !== -1) {
            prompt = cleanedString.substring(0, paramsIndex).trim();
            otherInfo = cleanedString.substring(paramsIndex).trim();
        } else {
            prompt = cleanedString;
        }

        promptTextarea.value = prompt;
        negativePromptTextarea.value = negativePrompt;

        const otherInfoMap = {};
        if (otherInfo) {
            const parts = otherInfo.split(', ');
            parts.forEach(part => {
                const [key, ...valueParts] = part.split(': ');
                if (key && valueParts.length > 0) {
                    otherInfoMap[key.trim()] = valueParts.join(': ').trim();
                }
            });
        }

        stepsInput.value = otherInfoMap['Steps'] || '';
        samplerInput.value = otherInfoMap['Sampler'] || '';
        cfgScaleInput.value = otherInfoMap['CFG scale'] || '';
        seedInput.value = otherInfoMap['Seed'] || '';
        sizeInput.value = otherInfoMap['Size'] || '';
        clipSkipInput.value = otherInfoMap['Clip skip'] || '';
        modelInput.value = otherInfoMap['Model'] || '';

        // Display the rest of the other info
        const remainingOtherInfo = { ...otherInfoMap };
        delete remainingOtherInfo['Steps'];
        delete remainingOtherInfo['Sampler'];
        delete remainingOtherInfo['CFG scale'];
        delete remainingOtherInfo['Seed'];
        delete remainingOtherInfo['Size'];
        delete remainingOtherInfo['Clip skip'];
        delete remainingOtherInfo['Model'];

        otherInfoTextarea.value = Object.entries(remainingOtherInfo)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
    }

    /**
     * UIをリセットする
     */
    function resetUI() {
        dropZone.classList.remove('hidden');
        resultArea.classList.add('hidden');
        errorMessage.classList.add('hidden');
        fileInput.value = ''; // 同じファイルを選択できるようにリセット
        previewImage.src = '#';
        promptTextarea.value = '';
        negativePromptTextarea.value = '';
        stepsInput.value = '';
        samplerInput.value = '';
        cfgScaleInput.value = '';
        seedInput.value = '';
        sizeInput.value = '';
        clipSkipInput.value = '';
        modelInput.value = '';
        otherInfoTextarea.value = '';
    }

    /**
     * 結果表示エリアを表示する
     */
    function showResultArea() {
        dropZone.classList.add('hidden');
        resultArea.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    /**
     * エラーメッセージを表示する
     */
    function showError() {
        dropZone.classList.add('hidden');
        resultArea.classList.add('hidden');
        errorMessage.classList.remove('hidden');
        
        // 5秒後にリセット
        setTimeout(resetUI, 5000);
    }
    
    /**
     * コピー完了のフィードバックを表示する
     * @param {HTMLElement} button 
     */
    function showCopiedFeedback(button) {
        const originalIcon = button.innerHTML;
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>`;
        button.classList.add('copied');

        setTimeout(() => {
            button.innerHTML = originalIcon;
            button.classList.remove('copied');
        }, 1500);
    }
});