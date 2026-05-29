import { Search } from "lucide-react";

import { motion } from "framer-motion";

function SearchBar() {

  return (

    <motion.div

      className="search-container"

      initial={{
        opacity: 0,
        y: 20
      }}

      animate={{
        opacity: 1,
        y: 0
      }}

      transition={{
        duration: 0.5
      }}
    >

      <Search
        size={20}
        className="search-icon"
      />

      <input
        type="text"
        placeholder="Buscar lentes..."
      />

    </motion.div>
  );
}

export default SearchBar;