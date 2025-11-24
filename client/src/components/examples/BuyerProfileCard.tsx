import BuyerProfileCard from '../BuyerProfileCard';

export default function BuyerProfileCardExample() {
  return (
    <BuyerProfileCard
      profile={{
        budget: "AUD 80-100 萬",
        location: "Chatswood 或 North Sydney",
        propertyType: "2 房公寓 (Apartment)",
        purpose: "自住",
        timeline: "3 個月內",
        notes: "需要靠近火車站，有停車位",
      }}
    />
  );
}
