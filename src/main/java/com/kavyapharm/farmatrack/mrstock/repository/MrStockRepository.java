package com.kavyapharm.farmatrack.mrstock.repository;

import com.kavyapharm.farmatrack.mrstock.model.MrStockItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MrStockRepository extends JpaRepository<MrStockItem, Long> {
    List<MrStockItem> findAllByUserName(String userName);

    Optional<MrStockItem> findByIdAndUserName(String productId, String userName);
}
