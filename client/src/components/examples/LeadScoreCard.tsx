import LeadScoreCard from '../LeadScoreCard';

export default function LeadScoreCardExample() {
  return (
    <LeadScoreCard
      leadScore="hot"
      leadReason="客戶預算明確（80-100萬）、地點需求清楚（Chatswood或North Sydney）、且表示需要盡快購買，顯示強烈購買意願。"
      followUpInDays={2}
      followUpMessage="您好！關於您想在 Chatswood 或 North Sydney 找 2 房公寓的需求，我這邊剛好有幾個很適合的物件，預算都在您的範圍內。方便的話，我們這週末可以約個時間帶您看房嗎？"
    />
  );
}
