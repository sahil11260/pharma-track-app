package com.kavyapharm.farmatrack.mrstock.repository;

import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MrStockRepository extends JpaRepository<MrStockItem, Long> {
    java.util.List<com.kavyapharm.farmatrack.mrstock.model.MrStockItem> findAllByUserNameIgnoreCase(String userName);

    java.util.Optional<com.kavyapharm.farmatrack.mrstock.model.MrStockItem> findByProductIdAndUserNameIgnoreCase(String productId,
            String userName);
}
