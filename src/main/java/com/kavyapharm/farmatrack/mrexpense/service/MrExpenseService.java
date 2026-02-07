package com.kavyapharm.farmatrack.mrexpense.service;

import com.kavyapharm.farmatrack.mrexpense.dto.CreateMrExpenseRequest;
import com.kavyapharm.farmatrack.mrexpense.dto.MrExpenseResponse;
import com.kavyapharm.farmatrack.mrexpense.dto.UpdateMrExpenseRequest;
import com.kavyapharm.farmatrack.mrexpense.model.MrExpense;
import com.kavyapharm.farmatrack.mrexpense.repository.MrExpenseRepository;
import com.kavyapharm.farmatrack.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class MrExpenseService {

    private final MrExpenseRepository repository;
    private final UserRepository userRepository;

    public MrExpenseService(MrExpenseRepository repository, UserRepository userRepository) {
        this.repository = repository;
        this.userRepository = userRepository;
    }

    public List<MrExpenseResponse> list() {
        String mrName = getCurrentMrName();
        if (mrName == null)
            return List.of();

        return repository
                .findByMrNameIgnoreCase(mrName,
                        Sort.by(Sort.Direction.DESC, "date").and(Sort.by(Sort.Direction.DESC, "id")))
                .stream().map(MrExpenseService::toResponse).toList();
    }

    public MrExpenseResponse get(Long id) {
        Objects.requireNonNull(id, "id is required");
        return toResponse(getEntity(id));
    }

    public MrExpenseResponse create(CreateMrExpenseRequest request) {
        String mrName = getCurrentMrName();
        long id = request.id() == null ? System.currentTimeMillis() : request.id();
        if (repository.existsById(id)) {
            id = System.currentTimeMillis();
        }

        MrExpense expense = new MrExpense();
        expense.setId(id);
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDate(request.date());
        expense.setDesc(request.desc());
        expense.setAttachment(request.attachment());
        expense.setStatus("Pending");
        expense.setMrName(mrName);

        return toResponse(repository.save(expense));
    }

    public MrExpenseResponse update(Long id, UpdateMrExpenseRequest request) {
        Objects.requireNonNull(id, "id is required");
        MrExpense expense = getEntity(id);

        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        expense.setDate(request.date());
        expense.setDesc(request.desc());
        expense.setAttachment(request.attachment());
        expense.setStatus(request.status());

        return toResponse(repository.save(expense));
    }

    public void delete(Long id) {
        Objects.requireNonNull(id, "id is required");
        if (!repository.existsById(id)) {
            return;
        }
        repository.deleteById(id);
    }

    private MrExpense getEntity(Long id) {
        Objects.requireNonNull(id, "id is required");
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("MR expense not found"));
    }

    private String getCurrentMrName() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }
        String email = auth.getName();
        return userRepository.findByEmailIgnoreCase(email)
                .map(com.kavyapharm.farmatrack.user.model.User::getName)
                .orElse(email);
    }

    public static MrExpenseResponse toResponse(MrExpense expense) {
        return new MrExpenseResponse(
                expense.getId(),
                expense.getCategory(),
                expense.getAmount(),
                expense.getDate(),
                expense.getDesc(),
                expense.getAttachment(),
                expense.getStatus());
    }
}
