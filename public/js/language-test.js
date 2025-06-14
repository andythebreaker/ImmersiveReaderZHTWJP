/**
 * Test utility for language detection and content separation
 */

function testLanguageDetection() {
    console.log("===== Testing Language Detection =====");
    const testCases = [
        { text: "これは日本語です。", expected: "ja" },
        { text: "這是中文。", expected: "zh-tw" },
        { text: "日文：テスト", expected: "ja" },
        { text: "中文：测试", expected: "zh-tw" },
        { text: "混合：テスト和測試", expected: "ja" }, // Should detect Japanese due to kana
        { text: "日文markers：テスト", expected: "ja" },
        { text: "中文markers：测试", expected: "zh-tw" }
    ];

    testCases.forEach((test, index) => {
        const result = detectLanguage(test.text);
        console.log(`Test ${index + 1}: ${result === test.expected ? "✅ PASS" : "❌ FAIL"}`);
        console.log(`- Text: "${test.text}"`);
        console.log(`- Expected: ${test.expected}, Got: ${result}`);
        
        if (result !== test.expected) {
            console.log(`- Contains Japanese: ${containsJapanese(test.text)}`);
            console.log(`- Contains Chinese: ${containsChinese(test.text)}`);
        }
        
        console.log("---");
    });
}

function testContentExtraction() {
    console.log("===== Testing Content Extraction =====");
    
    const testHtml = `
        <h1>混合语言测试 / 混合言語テスト</h1>
        <p>中文：这是中文内容测试</p>
        <p>日文：これは日本語のテストです</p>
        <div>
            <p>**中文** 更多的中文内容在这里</p>
            <p>**日文** もっと日本語のコンテントはここです</p>
        </div>
        <table border="1">
            <tr>
                <th>内容</th>
                <th>语言</th>
            </tr>
            <tr>
                <td>これは表のテストです</td>
                <td>日文</td>
            </tr>
            <tr>
                <td>这是表格测试</td>
                <td>中文</td>
            </tr>
        </table>
    `;
    
    const result = extractMarkedSections(testHtml);
    
    console.log("Japanese content detected:", !!result.japaneseHtml);
    console.log("Chinese content detected:", !!result.chineseHtml);
    
    // Test the processor
    const processed = processMixedLanguageContent("test-token", "test-subdomain", "Test Content", testHtml);
    console.log(`Processed into ${processed.chunks.length} chunks`);
    processed.chunks.forEach((chunk, i) => {
        console.log(`Chunk ${i+1} Language: ${chunk.lang}`);
    });
}

// Run tests when included on a page with a test button
document.addEventListener('DOMContentLoaded', () => {
    // Create test button if it doesn't exist
    if (!document.getElementById('test-language-detection')) {
        const button = document.createElement('button');
        button.id = 'test-language-detection';
        button.textContent = 'Test Language Detection';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.zIndex = 1000;
        button.addEventListener('click', () => {
            testLanguageDetection();
            testContentExtraction();
        });
        document.body.appendChild(button);
    }
});
