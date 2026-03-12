package com.kavyapharm.farmatrack.stockreceived.repository;

import com.kavyapharm.farmatrack.stockreceived.model.StockReceivedEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockReceivedRepository extends JpaRepository<StockReceivedEntry, Long> {
    List<StockReceivedEntry> findAllByProductIdIgnoreCaseOrderByDateDesc(String productId);
    List<StockReceivedEntry> findAllByUserNameIgnoreCaseOrderByDateDesc(String userName);
    List<StockReceivedEntry> findAllByProductIdIgnoreCaseAndUserNameIgnoreCaseOrderByDateDesc(String productId, String userName);
}
