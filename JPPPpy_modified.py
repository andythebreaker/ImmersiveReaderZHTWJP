import re

# 判斷是不是日文平假名、片假名或漢字
def contains_jp(text):
    # 平假名 \u3040-\u309F，片假名 \u30A0-\u30FF，日文漢字 \u4E00-\u9FFF
    # 注意：由於漢字與中文共用 Unicode 範圍，我們主要檢測假名和片假名
    return re.search(r'[\u3040-\u30FF]', text) is not None

def mark_jp_in_zh(text):
    # 定義各種標點符號及換行符作為斷句依據
    # 中文標點
    zh_puncts = '＝，。！？；：「」『』（）［］【】《》〈〉、…'
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
    # 使用正則表達式找出所有DOM元素
    pattern = r'<p class="([^"]+)">(.*?)</p>'
    
    # 解析XML找出所有元素
    elements = []
    for match in re.finditer(pattern, xml_text):
        class_name = match.group(1)
        content = match.group(2)
        elements.append((class_name, content))
    
    # 移除空白DOM並合併相同class的相鄰元素
    merged_elements = []
    current_class = None
    current_content = ""
    
    for class_name, content in elements:
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
    print("處理後的XML:")  # Debug: 查看處理前的XML
    print(result)  # Debug: 查看處理後的結果

    # 進行DOM清理和合併
    result = cleanup_xml(result)
    
    return result

if __name__ == "__main__":
    # 一般範例
    xml_input = '''
<p class="ZHTW">
   開場
妹妹～～今天我們來讀《ニコ☆プチ》上面的短短四段日文。妳五十音都背完了，超棒！接下來我們就一邊朗讀、一邊拆解單字跟文法，好嗎？
 （先深呼吸，唸日文前可以打拍子，放慢速度。）

第一段：先整句念
どんなところがまじめだと思うのかみんなに聞いてみたいな。
 私がまじめだと思うのはメンモのヒナタくん!
講稿
 「來，我先念一次喔——（朗讀）。妳跟我一起念第二次。」
 「好，現在拆一下：
どんなところ＝『哪一方面』。とこ ろ 其實是『地方』的意思，但在口語裡常常指『點、方面』。


まじめ＝『認真仔』，很常用形容詞。


思(おも)う＝覺得。


聞(き)く＝去問、打聽。
 所以整句就是：『我很好奇大家認為哪一點算是認真呢？』」


「然後『私がまじめだと思うのは～』—這裡用到『～だと思う』這個文法，中文就像『我覺得……』。妹妳試著用中文替換：『我覺得小明最帥』—日文就可以說『私は小明が一番かっこいいと思う』。OK？」
「來，小挑戰：妳覺得誰最可愛？用『～と思う』造一句～」

第二段：補充例子
撮影の合間に勉強していて、歴史上の人物にくわしい!(リンカ)
 頭が良くてしっかりしてる!(モア)…ありさ＝勉強家な印象♪
講稿
 「這段在誇某個小模特兒很認真。重點單字：
撮影(さつえい)：拍照拍片。


合間(あいま)：空檔。


くわしい：超懂、精通。


頭がいい：聰明。


しっかり：很穩、很可靠。
 『撮影の合間に勉強していて』就是說『拍攝空檔還在讀書』；接著又說她對歷史人物很熟，頭腦好又很可靠……好，整段意思大概明白吧？」


「這裡有一個『～ていて』，表示事情持續進行：『勉強していて』＝『正在念書中』。我們來練習：『我正在聽音樂』—日文怎麼說？（等妹回答：「音楽を聞いていて…」提醒她動詞要先變成て形喔。）」

第三段：自我否定＋輕鬆語氣
「ニコ☆プチ小学校の内容を覚えていてくれてありがとう♪
 でも自分ではあまりまじめだとは思わないかも~(笑)。」
講稿
 「這段作者回應粉絲：『謝謝妳還記得我們雜誌的小學校企劃～ 不過我自己倒不覺得自己有那麼認真啦，哈哈。』
覚えていて＝還記得（又是那個進行／狀態的 ていて）。


かも＝可能…吧，比較口語，比完整的『かもしれない』輕鬆。


～とは思わない＝『並不這麼認為』。
 所以『まじめだとは思わない』=『我不覺得自己很認真』。」


「實作一下：『我不覺得今天會下雨』—日文講『今日は雨が降るとは思わない』。我們一起唸一次～」

第四段：推測「～そう」
本をよく読んでいそう、…着まわしのマネージャー役がにあっていた、などの声が!
講稿
 「最後這段多半是別人對她的印象：
說她『本をよく読んでいそう』—看起來很常看書。重點是『～そう』，用來推測外觀或感覺『看起來…』。


企画(きかく)：企劃。


着まわし：穿搭混搭。


役(やく)：角色。
 整句很口語，其實就是：『感覺她很愛讀書、以前那個企劃拿了第二名、扮經理人角色好適合…之類的回饋！』」


「練習：把你的寵物貓也用『～そう』來形容一下？『うちの猫は眠そう』—『看起來快睡著』。OK！」

收尾與作業
「今天四段都讀完了！複習一下剛剛的關鍵文法：
～と思う（我覺得）


～てみる（試試看）


～ている／ていて（正在…／持續狀態）


～そう（看起來…）


かも（可能…吧）
 妳今晚試著用每個文法各造一句，明天我檢查～」



</p>
'''
    
    print("處理一般XML範例:")
    new_xml = process_xml(xml_input)
    print(new_xml)
