const deckTopics = [
    { value: 1, name: "Medicine", color: "#0891B2", backgroundColor: "#E0F2FE", imageName: "medicine-big" },
    { value: 2, name: "Languages", color: "#D97706", backgroundColor: "#FEF3C7", imageName: "languages-big" },
    { value: 3, name: "Geography", color: "#BC553A", backgroundColor: "#FBE8D7", imageName: "geography-big" },
    { value: 4, name: "School", color: "#4F46E5", backgroundColor: "#E0E7FF", imageName: "school-big" },
    { value: 5, name: "Maths", color: "#0D9488", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 6, name: "computing", color: "#FCA311", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 7, name: "games", color: "#AF52DE", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 8, name: "anatomy", color: "#65A30D", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 9, name: "biology", color: "#16A34A", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 10, name: "chemistry", color: "#EA580C", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 11, name: "history", color: "#D97706", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 12, name: "law", color: "#DC2626", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 13, name: "music", color: "#DB2777", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 14, name: "physics", color: "#4F46E5", backgroundColor: "#CCFBF1", imageName: "maths-big" },
    { value: 0, name: "other", color: "#AACC00", backgroundColor: "#CCFBF1", imageName: "maths-big" },
  ];
  
  // Function to find a deck topic by its number
  export function getDeckTopicByValue(value) {
    const topic = deckTopics.find(topic => topic.value === value);
    return topic || deckTopics[deckTopics.length - 1]; // Fallback to other topic
  }

  export function getAvatarImageName(num) {
    return `/avatar-${num % 73}.svg`;
  }