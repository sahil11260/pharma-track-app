package com.kavyapharm.farmatrack.expense.repository;

import com.kavyapharm.farmatrack.expense.model.Expense;
import com.kavyapharm.farmatrack.expense.model.Expense.ExpenseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByMrNameIgnoreCase(String mrName);

    List<Expense> findByStatus(ExpenseStatus status);

    List<Expense> findByMrNameIgnoreCaseAndStatus(String mrName, ExpenseStatus status);

    List<Expense> findAllByOrderBySubmittedDateDesc();

    List<Expense> findByMrNameIgnoreCaseOrderBySubmittedDateDesc(String mrName);
}
