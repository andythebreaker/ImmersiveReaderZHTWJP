import re
import bs4

# 判斷是不是日文平假名、片假名或漢字
def contains_jp(text):
    # 平假名 \u3040-\u309F，片假名 \u30A0-\u30FF，日文漢字 \u4E00-\u9FFF
    # 注意：由於漢字與中文共用 Unicode 範圍，我們主要檢測假名和片假名
    return re.search(r'[\u3040-\u30FF]', text) is not None

def mark_jp_in_zh(text):
    # 定義各種標點符號及換行符作為斷句依據
    # 中文標點
    zh_puncts = '＝，。！？；：「」『』（）［］【】《》〈〉、… '
    # 英文標點
    en_puncts = ',.!?;:"\'[]{}\\/<>-_+=`~@#$%^&*|'#!importamt do not remove : no ()!
    # 日文標點 (已包含在 \u3000-\u303F 範圍內)
    jp_puncts = '。、！？…'
    # 換行符
    line_breaks = '\n\r'
    
    # 組合所有標點符號和換行符
    all_puncts = zh_puncts + en_puncts + jp_puncts + line_breaks
    
    # 創建正則表達式用於分割文本，保留標點符號
    pattern = f'([{re.escape(all_puncts)}])'
    
    # 使用標點符號分割文本，但保留標點符號作為分割項
    segments = re.split(pattern, text)
    
    # 處理結果
    result = []
    current_segment = ""
    
    for i in range(0, len(segments)):
        current = segments[i]
        if not current:  # 跳過空白項
            continue
            
        # 將當前段落添加到當前分段
        current_segment += current
        
        # 如果當前項是標點符號或是最後一項，則處理並重置當前分段
        if current in all_puncts or i == len(segments) - 1:
            # 如果分段不為空，處理它
            if current_segment.strip():
                # 如果包含日文，標記整個分段
                if contains_jp(current_segment):
                    result.append(f'</p><p class="JP">{current_segment}</p><p class="ZHTW">')
                else:
                    result.append(current_segment)
            
            # 重置當前分段
            current_segment = ""
    
    return ''.join(result)

def cleanup_xml(xml_text):
    """
    1. 移除空的DOM元素
    2. 合併相同class的相鄰DOM元素
    """
    import bs4
    
    # 創建一個臨時的包裹元素，以便解析可能不完整的HTML片段
    wrapped_xml = f"<div>{xml_text}</div>"
    
    # 使用Beautiful Soup解析HTML
    soup = bs4.BeautifulSoup(wrapped_xml, 'html.parser')
    
    # 尋找所有的p元素
    p_elements = soup.find_all('p')
    
    # 移除空白DOM並合併相同class的相鄰元素
    merged_elements = []
    current_class = None
    current_content = ""
    
    for p in p_elements:
        # 獲取class屬性
        class_name = p.get('class', [''])[0] if p.get('class') else ''
        # 獲取內容文本
        content = p.get_text()
        
        # 跳過空的DOM元素
        if not content.strip():
            continue
        
        # 如果與前一個元素的class相同，則合併
        if class_name == current_class:
            current_content += content
        else:
            # 保存前一個處理好的元素（如果有的話）
            if current_class:
                merged_elements.append((current_class, current_content))
            # 開始新的元素
            current_class = class_name
            current_content = content
    
    # 加入最後一個元素（如果有的話）
    if current_class:
        merged_elements.append((current_class, current_content))
    
    # 重建XML
    result = []
    for class_name, content in merged_elements:
        result.append(f'<p class="{class_name}">{content}</p>')
    
    return ' '.join(result)

def process_xml(xml_text):
    # 處理所有 ZHTW 段
    def repl(m):
        original = m.group(0)
        content = m.group(1)
        # 標註JP
        new_content = mark_jp_in_zh(content)
        return f'<p class="ZHTW">{new_content}</p>'
    
    # 只處理ZHTW
    result = re.sub(r'<p class="ZHTW">(.*?)</p>', repl, xml_text, flags=re.DOTALL)

    # 進行DOM清理和合併
    result = cleanup_xml(result)    # 將所有 ':(' 替換為 <span>:</span><span>(</span>
    result = re.sub(r':\(', r'<span>:</span><span>(</span>', result)
    result = re.sub(r'\)：', r'<span>)</span><span>:</span>', result)
    
    return result

if __name__ == "__main__":
    # 一般範例
    xml_input = '''
<p class="ZHTW">
 講稿：「イメージ通りみんなのお姉ちゃんになれるようにがんばる! ちなみに私なら アイラとリンカを選ぶ」
 第一段：一句一句拆解講解（超白話版）
「イメージ通り」

這邊的「イメージ」就是英文的 image，也就是「印象、想像」的意思～
然後「通り（どおり）」是「照著～那樣、跟～一樣」。
合起來「イメージ通り」就是：
「像大家想像中的那樣～」或是「符合形象的那樣～」

例子來一下：

イメージ通りの人だった！= 跟我想像中的一樣的人耶！

「みんなのお姉ちゃんになれるように」

超常見的句型來了！我們來分兩半講：

「みんなのお姉ちゃん」＝大家的姊姊（聽起來是不是很偶像感XD）

「なれるように」

「なる」= 變成

「なれる」是它的可能形（可以變成～）

「ように」= 為了要～的話

整句翻成白話就是：
「為了可以變成大家心目中的姊姊～」的感覺。

這個「～ように」真的超常用！

小例句：

日本語が話せるように、毎日れんしゅうしてる！
（為了能講日文，我每天都在練習！）

「がんばる!」

這個妳應該已經知道啦～就是「我會努力！」
整句連起來就是：
「我會努力讓自己變成大家心目中的姊姊形象！」

「ちなみに私なら アイラとリンカを選ぶ」

這邊是轉換話題的補充句～

「ちなみに」= 順帶一提～

「私なら」= 如果是我的話～

「アイラとリンカを選ぶ」= 我會選アイラ跟リンカ

整句意思就變成：
「順帶一提，如果是我的話，我會選アイラ跟リンカ～」

這邊的「なら」是「如果是～的話」的意思，也超實用！

例句補充：

あなたならどうする？（如果是你會怎麼做？）

週末なら行けるよ！（如果是週末我可以去！）

</p>
'''
    
    print("處理一般XML範例:")
    new_xml = process_xml(xml_input)
    print(new_xml)
