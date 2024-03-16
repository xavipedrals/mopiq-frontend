// src/components/Home.vue
<template>
  <div>
    <h1>Home Page</h1>
    <p>Welcome to the Home Page.</p>
  </div>
</template>

<script>
import db from '@/firebaseInit';
import { collection, getDocs } from 'firebase/firestore';
// import { collection, getDocs } from 'firebase/firestore';

// const myCollection = collection(db, 'shared-decks');
// getDocs(myCollection).then(snapshot => {
//   // Process snapshot
//   print(snapshot.docs.length);
// });

export default {
  name: 'HomePage',
  data() {
    return {
      docCount: 0,
    };
  },
  async created() {
    try {
      // const db = getFirestore();
      const querySnapshot = await getDocs(collection(db, 'shared-decks'));
      console.log(querySnapshot.size);
      this.docCount = querySnapshot.size; // Update docCount with the size of the collection
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  },
};

// export default {
//   name: 'HomePage',
// };
</script>