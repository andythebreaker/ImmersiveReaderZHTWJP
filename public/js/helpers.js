function getTokenAndSubdomainAsync() {
    return new Promise(function (resolve, reject) {
        $.ajax({
            url: "/GetTokenAndSubdomain",
            type: "GET",
            success: function (data) {
                if (data.error) {
                    reject(data.error);
                } else {
                    resolve(data);
                }
            },
            error: function (err) {
                reject(err);
            }
        });
    });
}

/**
 * Detects if the provided text contains Japanese characters.
 * @param {string} text - The text to check.
 * @returns {boolean} - True if the text contains Japanese characters.
 */
function containsJapanese(text) {
    // Special case for explicit language marker in table
    if (text.trim() === '日文') {
        return true;
    }
    
    // Check for hiragana and katakana - these are uniquely Japanese
    const hiraganaKatakanaRegex = /[\u3040-\u309F\u30A0-\u30FF]/;
    
    // Check specific Japanese markers
    const hasJapaneseMarker = text.includes('日文：') || 
                             text.includes('日文:') || 
                             text.includes('**日文**') ||
                             /\[日文\]|\(日文\)/.test(text);
    
    // Japanese-specific patterns (particles, endings)
    const japanesePatterns = /(?:です|ます|した|ません|でした|ください|だよ|だね|のです|ましょう)/;
    
    // If text has hiragana/katakana, Japanese markers, or specific patterns
    return hiraganaKatakanaRegex.test(text) || hasJapaneseMarker || japanesePatterns.test(text);
}

/**
 * Detects if the provided text contains Chinese characters.
 * @param {string} text - The text to check.
 * @returns {boolean} - True if the text contains Chinese characters.
 */
function containsChinese(text) {
    // Special case for explicit language marker in table
    if (text.trim() === '中文') {
        return true;
    }
    
    // First check if it contains definitive Japanese-specific characters (hiragana/katakana)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
        // Has definitive Japanese characters, not just Chinese
        return false;
    }
    
    // Enhanced Chinese character ranges
    const chineseRegex = /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/;
    
    // Check specific Chinese markers
    const hasChineseMarker = text.includes('中文：') || 
                            text.includes('中文:') ||
                            text.includes('**中文**') ||
                            /\[中文\]|\(中文\)/.test(text);
    
    // Chinese-specific particles and patterns
    const chinesePatterns = /(?:的|了|是|不|在|有|和|我|你|他|她|它|們|们|這|这|那|哪|什麼|什么)/;
    
    // Traditional Chinese specific characters (that aren't in Japanese common usage)
    const traditionalChineseChars = /[錒-鎢]/;
    
    // If text has Chinese characters and no definitive Japanese markers
    return chineseRegex.test(text) || 
           hasChineseMarker || 
           chinesePatterns.test(text) ||
           traditionalChineseChars.test(text);
}

/**
 * Detects the primary language for text that might contain both Chinese and Japanese.
 * @param {string} text - The text to check.
 * @returns {string} - 'ja' for Japanese, 'zh-tw' for Chinese.
 */
function detectLanguage(text) {
    // Special case for table cell language markers
    if (text.trim() === '日文') return 'ja';
    if (text.trim() === '中文') return 'zh-tw';
    
    // Count explicit language markers
    const jaMarkers = (text.match(/日文[:：]|\*\*日文\*\*|\[日文\]|\(日文\)/g) || []).length;
    const zhMarkers = (text.match(/中文[:：]|\*\*中文\*\*|\[中文\]|\(中文\)/g) || []).length;
    
    // Count Japanese-specific characters (hiragana and katakana)
    const jaCharCount = (text.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
    
    // Count Japanese-specific patterns
    const jaPatternCount = (text.match(/(?:です|ます|した|ません|でした|ください|だよ|だね|のです|ましょう)/g) || []).length;
    
    // Count Chinese-specific particles and patterns
    const zhPatternCount = (text.match(/(?:的|了|是|不|在|有|和|我|你|他|她|它|們|们|這|这|那|哪|什麼|什么)/g) || []).length;
    
    // Analyze table cells from x.html if present
    const isTableCell = /<td>.*?<\/td>/.test(text);
    if (isTableCell) {
        // Extract language column value if this appears to be from the language table
        const langMatch = text.match(/<td>(中文|日文)<\/td>/);
        if (langMatch) {
            return langMatch[1] === '日文' ? 'ja' : 'zh-tw';
        }
    }
    
    // If Japanese markers or specific characters are present
    if (jaMarkers > 0 || jaCharCount > 0 || jaPatternCount > 0) {
        return 'ja';
    } 
    // If Chinese markers or dominant Chinese patterns
    else if (zhMarkers > 0 || zhPatternCount > 0) {
        return 'zh-tw';
    }
    // If no clear indicators but has definitive Japanese characteristics
    else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
        return 'ja';
    }
    // If it has Chinese characters without Japanese-specific ones
    else if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
        return 'zh-tw';
    }
    
    // Default to Chinese if unable to detect
    return 'zh-tw';
}

/**
 * Extracts Japanese sections from mixed content
 * @param {string} content - HTML content to process
 * @returns {string} - HTML with just Japanese sections
 */
function extractJapaneseSections(content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Find all Japanese sections
    const japaneseContent = [];
    
    // Handle HTML tables specifically - for content like x.html
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const contentCell = cells[0];
                const languageCell = cells[1];
                
                // If language cell indicates Japanese, add content cell to Japanese content
                if (languageCell && (languageCell.textContent || '').trim() === '日文') {
                    const content = contentCell ? contentCell.textContent : '';
                    if (content && content.trim()) {
                        japaneseContent.push(`<p class="japanese-section">${content}</p>`);
                    }
                }
            }
        });
    });
    
    // Get all list items that contain Japanese text
    const items = tempDiv.querySelectorAll('li');
    items.forEach(item => {
        const itemText = item.textContent || '';
        if (containsJapanese(itemText) && !itemText.match(/中文[:：]/) && !itemText.match(/^[\s\u4e00-\u9fff]+$/)) {
            japaneseContent.push(`<li class="japanese-section">${item.innerHTML}</li>`);
        }
    });
    
    // Get sections with Japanese markers or Japanese text
    const textElements = tempDiv.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
    textElements.forEach(element => {
        const text = element.textContent || '';
        
        // Skip elements that are clearly Chinese-only
        if (text.match(/^[\s\u4e00-\u9fff]+$/) && !containsJapanese(text)) {
            return;
        }
        
        // Extract Japanese text with markers
        if (text.includes('日文：') || text.includes('日文:') || 
            text.includes('**日文**') || text.match(/\[日文\]|\(日文\)/)) {
            
            // Extract just the Japanese part
            const matches = text.match(/(?:日文[:：]|\*\*日文\*\*[:：]?|\[日文\]|\(日文\))\s*([\s\S]*?)(?=(?:\n|$|中文[:：]|\*\*中文\*\*|\[中文\]|\(中文\)))/g);
            
            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    const jaText = match.replace(/(?:日文[:：]|\*\*日文\*\*[:：]?|\[日文\]|\(日文\))\s*/, '').trim();
                    if (jaText) {
                        japaneseContent.push(`<p class="japanese-section">${jaText}</p>`);
                    }
                });
            } else if (containsJapanese(text)) {
                // If marker exists but extraction failed, include the whole element
                japaneseContent.push(`<${element.tagName.toLowerCase()} class="japanese-section">${element.innerHTML}</${element.tagName.toLowerCase()}>`);
            }
        }
        // If no marker but has Japanese characters and no Chinese marker
        else if (containsJapanese(text) && !text.match(/中文[:：]|\*\*中文\*\*|\[中文\]|\(中文\)/)) {
            // Check if it has Japanese-specific characters (not just kanji)
            if (text.match(/[\u3040-\u309F\u30A0-\u30FF]/) || 
                text.match(/(?:です|ます|した|ません|でした|ください|だよ|だね|のです|ましょう)/)) {
                japaneseContent.push(`<${element.tagName.toLowerCase()} class="japanese-section">${element.innerHTML}</${element.tagName.toLowerCase()}>`);
            }
        }
    });
    
    // Wrap in a div with Japanese language attribute
    return japaneseContent.length > 0 ? 
        `<div lang="ja" class="language-ja">${japaneseContent.join('')}</div>` : '';
}

/**
 * Extracts Chinese sections from mixed content
 * @param {string} content - HTML content to process
 * @returns {string} - HTML with just Chinese sections
 */
function extractChineseSections(content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Find all Chinese sections
    const chineseContent = [];
    
    // Handle HTML tables specifically - for content like x.html
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const contentCell = cells[0];
                const languageCell = cells[1];
                
                // If language cell indicates Chinese, add content cell to Chinese content
                if (languageCell && (languageCell.textContent || '').trim() === '中文') {
                    const content = contentCell ? contentCell.textContent : '';
                    if (content && content.trim()) {
                        chineseContent.push(`<p class="chinese-section">${content}</p>`);
                    }
                }
            }
        });
    });
    
    // Get all list items that contain Chinese text but not Japanese
    const items = tempDiv.querySelectorAll('li');
    items.forEach(item => {
        const itemText = item.textContent || '';
        if (containsChinese(itemText) && !containsJapanese(itemText)) {
            chineseContent.push(`<li class="chinese-section">${item.innerHTML}</li>`);
        }
    });
    
    // Get text elements with Chinese content
    const textElements = tempDiv.querySelectorAll('p, div, span, h1, h2, h3, h4, h5, h6');
    textElements.forEach(element => {
        const text = element.textContent || '';
        
        // Skip if it has Japanese-specific characters
        if (text.match(/[\u3040-\u309F\u30A0-\u30FF]/) || 
            text.match(/(?:です|ます|した|ません|でした|ください|だよ|だね|のです|ましょう)/)) {
            return;
        }
        
        // Extract Chinese text with markers
        if (text.includes('中文：') || text.includes('中文:') || 
            text.includes('**中文**') || text.match(/\[中文\]|\(中文\)/)) {
            
            // Extract just the Chinese part
            const matches = text.match(/(?:中文[:：]|\*\*中文\*\*[:：]?|\[中文\]|\(中文\))\s*([\s\S]*?)(?=(?:\n|$|日文[:：]|\*\*日文\*\*|\[日文\]|\(日文\)))/g);
            
            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    const zhText = match.replace(/(?:中文[:：]|\*\*中文\*\*[:：]?|\[中文\]|\(中文\))\s*/, '').trim();
                    if (zhText) {
                        chineseContent.push(`<p class="chinese-section">${zhText}</p>`);
                    }
                });
            } else if (containsChinese(text) && !containsJapanese(text)) {
                // If marker exists but extraction failed, include the whole element
                chineseContent.push(`<${element.tagName.toLowerCase()} class="chinese-section">${element.innerHTML}</${element.tagName.toLowerCase()}>`);
            }
        }
        // If no marker but has Chinese characters and no Japanese
        else if (containsChinese(text) && !containsJapanese(text)) {
            chineseContent.push(`<${element.tagName.toLowerCase()} class="chinese-section">${element.innerHTML}</${element.tagName.toLowerCase()}>`);
        }
        
        // Handle headings - typically these should be in Chinese
        if ((element.tagName === 'H1' || element.tagName === 'H2' || 
             element.tagName === 'H3' || element.tagName === 'H4') && 
            !text.match(/[\u3040-\u309F\u30A0-\u30FF]/)) {
            // Skip if already added or has Japanese characters
            if (!chineseContent.some(item => item.includes(element.innerHTML))) {
                chineseContent.push(`<${element.tagName.toLowerCase()} class="chinese-section">${element.innerHTML}</${element.tagName.toLowerCase()}>`);
            }
        }
    });
    
    // Wrap in a div with Chinese language attribute
    return chineseContent.length > 0 ? 
        `<div lang="zh-tw" class="language-zh">${chineseContent.join('')}</div>` : '';
}

/**
 * Directly extracts marked sections by language
 * @param {string} content - The HTML content
 * @returns {Object} - An object with Japanese and Chinese content
 */
function extractMarkedSections(content) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    let japaneseHtml = '<div lang="ja">';
    let chineseHtml = '<div lang="zh-tw">';
    
    let hasJapanese = false;
    let hasChinese = false;
    
    // Handle HTML tables specifically - for content like x.html which has structured language marking
    const tables = tempDiv.querySelectorAll('table');
    tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        
        // Check if this is a language-marked table like in x.html
        const isLanguageTable = Array.from(rows).some(row => {
            const cells = row.querySelectorAll('td');
            return cells.length >= 2 && 
                  (cells[1].textContent || '').match(/^(中文|日文)$/);
        });
        
        if (isLanguageTable) {
            // First add header with language column hidden
            const headerRows = table.querySelectorAll('tr:first-child');
            if (headerRows.length > 0) {
                const headerRow = headerRows[0];
                const headerCells = headerRow.querySelectorAll('th, td');
                
                // Add a modified version of the header
                let headerHtml = '<tr>';
                for (let i = 0; i < headerCells.length; i++) {
                    const cell = headerCells[i];
                    const text = cell.textContent || '';
                    
                    headerHtml += '<th';
                    // Hide language column header from screen readers
                    if (i === 1 || text.includes('語言') || text.includes('中文還是日文') || 
                        text.includes('language') || text.toLowerCase().includes('chinese or japanese')) {
                        headerHtml += ' aria-hidden="true" class="language-indicator-column"';
                    }
                    headerHtml += '>' + text + '</th>';
                }
                headerHtml += '</tr>';
                
                // Add header to both language sections
                if (headerHtml) {
                    japaneseHtml += '<table>' + headerHtml;
                    chineseHtml += '<table>' + headerHtml;
                }
            }
            
            // Process content rows
            const contentRows = table.querySelectorAll('tr:not(:first-child)');
            contentRows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const contentCell = cells[0];
                    const languageCell = cells[1];
                    const content = contentCell ? contentCell.textContent : '';
                    
                    if (languageCell && content && content.trim()) {
                        const lang = (languageCell.textContent || '').trim();
                        
                        // Create row with language column hidden from screen readers
                        const rowHtml = 
                            '<tr><td>' + content + '</td>' + 
                            '<td aria-hidden="true" class="language-indicator-column">' + lang + '</td></tr>';
                        
                        if (lang === '日文') {
                            japaneseHtml += rowHtml;
                            hasJapanese = true;
                        } else if (lang === '中文') {
                            chineseHtml += rowHtml;
                            hasChinese = true;
                        }
                    }
                }
            });
            
            // Close tables if we added any rows
            if (hasJapanese) japaneseHtml += '</table>';
            if (hasChinese) chineseHtml += '</table>';
        }
    });
    
    // Process each text-containing element in the document
    const sections = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, span, ul, ol, li');
    sections.forEach(section => {
        const text = section.textContent || '';
        if (!text.trim()) return;
        
        // Japanese section detection
        const jaMarkers = text.match(/(?:日文[:：]|\*\*日文\*\*[:：]?|\[日文\]|\(日文\))\s*([\s\S]*?)(?=(?:\n|$|中文[:：]|\*\*中文\*\*|\[中文\]|\(中文\)))/g);
        if (jaMarkers && jaMarkers.length > 0) {
            jaMarkers.forEach(marker => {
                const jaText = marker.replace(/(?:日文[:：]|\*\*日文\*\*[:：]?|\[日文\]|\(日文\))\s*/, '').trim();
                if (jaText) {
                    japaneseHtml += `<p>${jaText}</p>`;
                    hasJapanese = true;
                }
            });
        } 
        else if (containsJapanese(text) && !text.match(/中文[:：]|\*\*中文\*\*|\[中文\]|\(中文\)/)) {
            // If it has Japanese characters and no Chinese marker
            if (text.match(/[\u3040-\u309F\u30A0-\u30FF]/) || 
                text.match(/(?:です|ます|した|ません|でした|ください|だよ|だね|のです|ましょう)/)) {
                japaneseHtml += `<${section.tagName.toLowerCase()}>${section.innerHTML}</${section.tagName.toLowerCase()}>`;
                hasJapanese = true;
            }
        }
        
        // Chinese section detection
        const zhMarkers = text.match(/(?:中文[:：]|\*\*中文\*\*[:：]?|\[中文\]|\(中文\))\s*([\s\S]*?)(?=(?:\n|$|日文[:：]|\*\*日文\*\*|\[日文\]|\(日文\)))/g);
        if (zhMarkers && zhMarkers.length > 0) {
            zhMarkers.forEach(marker => {
                const zhText = marker.replace(/(?:中文[:：]|\*\*中文\*\*[:：]?|\[中文\]|\(中文\))\s*/, '').trim();
                if (zhText) {
                    chineseHtml += `<p>${zhText}</p>`;
                    hasChinese = true;
                }
            });
        }
        else if (containsChinese(text) && !containsJapanese(text)) {
            // If it has Chinese characters but no Japanese
            chineseHtml += `<${section.tagName.toLowerCase()}>${section.innerHTML}</${section.tagName.toLowerCase()}>`;
            hasChinese = true;
        }
        
        // Handle headings as Chinese by default unless they contain Japanese
        if ((section.tagName === 'H1' || section.tagName === 'H2' || 
             section.tagName === 'H3' || section.tagName === 'H4') && 
            !text.match(/[\u3040-\u309F\u30A0-\u30FF]/) &&
            !section.innerHTML.includes('japanese-section')) {
            
            // Skip if already added
            if (!chineseHtml.includes(section.innerHTML)) {
                chineseHtml += `<${section.tagName.toLowerCase()}>${section.innerHTML}</${section.tagName.toLowerCase()}>`;
                hasChinese = true;
            }
        }
    });
    
    japaneseHtml += '</div>';
    chineseHtml += '</div>';
    
    return {
        japaneseHtml: hasJapanese ? japaneseHtml : '',
        chineseHtml: hasChinese ? chineseHtml : ''
    };
}

/**
 * Processes mixed language content by creating separate chunks for Japanese and Chinese content.
 * @param {string} token - Authentication token
 * @param {string} subdomain - Azure subdomain
 * @param {string} title - Content title
 * @param {string} content - HTML content
 */
function processMixedLanguageContent(token, subdomain, title, content) {
    console.log("Processing mixed language content...");
    
    // Check for table content which requires special handling
    const hasTableContent = content.includes('<table') && content.includes('</table>');
    
    // IMPORTANT: If this is the original table from x.html, we should process the entire table
    // and maintain all content, not just split it by language
    const isSpecialTable = content.includes('內容') && content.includes('語言（念中文還是日文）');
    
    if (isSpecialTable) {
        console.log("Detected special language table, using combined approach");
        // When dealing with the special language table, we need to keep both languages together
        // but still mark each row with the appropriate language
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Process the table, but keep it whole
        const processedContent = processTableWithLanguageMarkers(tempDiv);
        
        // We're returning the processed content as a single chunk, but with language markers
        return {
            title: title,
            chunks: [{
                content: processedContent,
                mimeType: "text/html"
                // No specific language here, as we'll let the Immersive Reader process
                // the language markers in the HTML
            }]
        };
    }
    else if (hasTableContent) {
        console.log("Detected standard table content, extracting languages");
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        
        // Process table with language markers
        let japaneseHtml = '<div lang="ja">';
        let chineseHtml = '<div lang="zh-tw">';
        
        let hasJapanese = false;
        let hasChinese = false;
        
        const tables = tempDiv.querySelectorAll('table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const contentCell = cells[0];
                    const languageCell = cells[1];
                    
                    if (contentCell && languageCell) {
                        const content = contentCell.textContent || '';
                        const lang = (languageCell.textContent || '').trim();
                        
                        if (content && content.trim()) {
                            if (lang === '日文') {
                                japaneseHtml += `<p class="japanese-section">${content}</p>`;
                                hasJapanese = true;
                            } else if (lang === '中文') {
                                chineseHtml += `<p class="chinese-section">${content}</p>`;
                                hasChinese = true;
                            }
                        }
                    }
                }
            });
        });
        
        japaneseHtml += '</div>';
        chineseHtml += '</div>';
        
        if (!hasJapanese) japaneseHtml = '';
        if (!hasChinese) chineseHtml = '';
        
        console.log("Table extraction - Japanese content:", !!japaneseHtml);
        console.log("Table extraction - Chinese content:", !!chineseHtml);
        
        // Create chunks for both languages
        const chunks = [];
        
        // Always add both chunks for table content to ensure both languages are spoken
        if (japaneseHtml) {
            chunks.push({
                content: japaneseHtml,
                mimeType: "text/html",
                lang: "ja"
            });
        }
        
        if (chineseHtml) {
            chunks.push({
                content: chineseHtml,
                mimeType: "text/html",
                lang: "zh-tw"
            });
        }
        
        // If somehow no content was extracted, use original
        if (chunks.length === 0) {
            chunks.push({
                content: content,
                mimeType: "text/html"
            });
        }
        
        return {
            title: title,
            chunks: chunks
        };
    } else {
        // Use the regular extraction method for non-table content
        const extractedSections = extractMarkedSections(content);
        let japaneseHtml = extractedSections.japaneseHtml;
        let chineseHtml = extractedSections.chineseHtml;
        
        console.log("Standard extraction - Japanese content:", !!japaneseHtml);
        console.log("Standard extraction - Chinese content:", !!chineseHtml);
        
        // If standard extraction didn't find any content, try the specialized methods
        if (!japaneseHtml && !chineseHtml) {
            console.log("Standard extraction found no content, trying specialized methods");
            japaneseHtml = extractJapaneseSections(content);
            chineseHtml = extractChineseSections(content);
            
            console.log("Specialized extraction - Japanese content:", !!japaneseHtml);
            console.log("Specialized extraction - Chinese content:", !!chineseHtml);
        }
        
        // Create chunks for the Immersive Reader
        const chunks = [];
        
        // Add chunks based on detected content
        if (japaneseHtml) {
            chunks.push({
                content: japaneseHtml,
                mimeType: "text/html",
                lang: "ja"
            });
            console.log("Added Japanese chunk");
        }
        
        if (chineseHtml) {
            chunks.push({
                content: chineseHtml,
                mimeType: "text/html",
                lang: "zh-tw"
            });
            console.log("Added Chinese chunk");
        }
        
        // If no content was extracted, use the original content
        if (chunks.length === 0) {
            console.log("No language content detected, using original content");
            chunks.push({
                content: content,
                mimeType: "text/html",
                lang: "zh-tw" // Default to Chinese
            });
        }
        
        console.log(`Processed content into ${chunks.length} chunks`);
        
        return {
            title: title,
            chunks: chunks
        };
    }
}

/**
 * Processes a table with language markers and returns HTML with language tags
 * @param {HTMLElement} containerDiv - The div containing the table
 * @returns {string} - HTML with language tags
 */
function processTableWithLanguageMarkers(containerDiv) {
    let processedHtml = '';
    
    // Clone the table to avoid modifying the original
    const tables = containerDiv.querySelectorAll('table');
    if (tables.length === 0) return containerDiv.innerHTML;
    
    tables.forEach(table => {
        // Create a new table that we'll modify
        const newTable = document.createElement('table');
        if (table.hasAttribute('border')) {
            newTable.setAttribute('border', table.getAttribute('border'));
        }
        if (table.className) {
            newTable.className = table.className;
        }
        
        // Copy the header row and modify to hide language column header from screen readers
        const headerRows = table.querySelectorAll('tr:first-child');
        if (headerRows.length > 0) {
            const headerRow = headerRows[0].cloneNode(true);
            const headerCells = headerRow.querySelectorAll('th, td');
            
            // Check each header cell for language indicators
            for (let i = 0; i < headerCells.length; i++) {
                const cell = headerCells[i];
                const text = cell.textContent || '';
                
                // If the header contains text indicating it's a language column, hide it from screen readers
                if (text.includes('語言') || 
                    text.includes('中文還是日文') || 
                    text.includes('中文') || 
                    text.includes('日文') ||
                    text.includes('language') || 
                    text.toLowerCase().includes('chinese or japanese')) {
                    cell.setAttribute('aria-hidden', 'true');
                    cell.classList.add('language-indicator-column');
                }
            }
            
            newTable.appendChild(headerRow);
        }
        
        // Process each content row
        const contentRows = table.querySelectorAll('tr:not(:first-child)');
        contentRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const contentCell = cells[0];
                const languageCell = cells[1];
                
                if (contentCell && languageCell) {
                    const content = contentCell.textContent || '';
                    const lang = (languageCell.textContent || '').trim();
                    
                    if (content && content.trim()) {
                        // Create a new row
                        const newRow = document.createElement('tr');
                        
                        // Create content cell with language attribute
                        const newContentCell = document.createElement('td');
                        if (lang === '日文') {
                            newContentCell.setAttribute('lang', 'ja');
                            newContentCell.className = 'japanese-section';
                        } else if (lang === '中文') {
                            newContentCell.setAttribute('lang', 'zh-tw');
                            newContentCell.className = 'chinese-section';
                        }
                        newContentCell.textContent = content;
                        
                        // Add language cell but hide from screen readers
                        const newLanguageCell = document.createElement('td');
                        newLanguageCell.textContent = lang;
                        newLanguageCell.setAttribute('aria-hidden', 'true');
                        newLanguageCell.classList.add('language-indicator-column');
                        
                        // Add cells to row
                        newRow.appendChild(newContentCell);
                        newRow.appendChild(newLanguageCell);
                        
                        // Add row to table
                        newTable.appendChild(newRow);
                    }
                }
            } else {
                // If row doesn't have the expected structure, copy as-is
                newTable.appendChild(row.cloneNode(true));
            }
        });
        
        // Add the processed table to the result
        processedHtml += newTable.outerHTML;
    });
    
    return processedHtml || containerDiv.innerHTML;
}